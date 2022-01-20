import path from 'path';

import { Datastore } from '@google-cloud/datastore';
import ora, { Ora } from 'ora';
import prettyBytes from 'pretty-bytes';
import * as R from 'ramda';

export async function dumpAllKinds(
  datastore: Datastore,
  bucketName: string,
  backupName?: string,
  backupDir = 'bak',
  spinner?: Ora
) {
  spinner = spinner || ora({ isSilent: true });
  const outputUrls: string[] = [];

  backupName = backupName || (await getBackupDefaultName(datastore));
  spinner.info(`backup to gs://${bucketName}/${backupDir}/${backupName}`);
  spinner.info(
    `Dumping datastore ${await datastore.getProjectId()}` +
      (datastore.namespace ? `for namespace ${datastore.namespace}` : '')
  );

  try {
    spinner.start(`Loading Kinds`);
    const kindNames = await getKindNames(datastore);
    spinner.succeed(`${kindNames.length} Kinds`).start();

    for (const sublist of R.splitEvery(100, kindNames)) {
      spinner.start();
      const { outputUrl } = await dumpKinds(
        datastore,
        sublist,
        bucketName,
        backupDir,
        `${backupName}-${outputUrls.length}`,
        spinner
      );
      outputUrls.push(outputUrl);
    }
    spinner.start().succeed(`written ${outputUrls}`);
  } catch (error) {
    spinner.fail(error.message);
    throw error;
  }
  return outputUrls;
}

async function getBackupDefaultName(datastore: Datastore) {
  return (
    new Date()
      .toISOString()
      .replaceAll(/[-:Z]/g, '')
      .replaceAll(/\.\d+$/g, '') +
    '-' +
    (await datastore.getProjectId()) +
    (datastore.namespace ? `:${datastore.namespace}` : '')
  );
}

async function dumpKinds(
  datastore: Datastore,
  kindNames: string[],
  backupBucket: string,
  backupDir: string,
  backupName: string,
  spinner?: any
) {
  spinner = spinner || ora({ isSilent: true });
  const infoText =
    kindNames.length > 1 ? `${kindNames.length} kinds ` : kindNames[0];
  spinner.prefixText = infoText;
  spinner.start();
  const backupSubDirName =
    kindNames.length > 1 ? backupName : path.join(backupName, kindNames[0]);
  const outputUrlPrefix = `gs://${path.join(
    backupBucket,
    backupDir,
    backupSubDirName
  )}`;
  spinner.info(`Dumping ${kindNames.join(', ')}`);
  spinner.info(`Dumping to ${outputUrlPrefix}`).start();

  const logProgress = (status) => {
    // The counters are https://github.com/dcodeIO/long.js
    // const eD: number = status.progressEntities.workCompleted.toNumber();
    // const eT: number = status.progressEntities.workEstimated.toNumber();
    const bD: number = status.progressBytes.workCompleted.toNumber();
    const bT: number = status.progressBytes.workEstimated.toNumber();
    spinner.text = `${prettyBytes(bD)} of ${prettyBytes(bT)} ${(
      (bD / bT) *
      100
    ).toFixed(1)}%`;
  };

  // https://cloud.google.com/datastore/docs/reference/admin/rest/v1/projects/export
  try {
    const [operation] = await datastore.export({
      outputUrlPrefix,
      kinds: kindNames,
      namespaces: [datastore.namespace],
    });
    // see https://googleapis.github.io/gax-nodejs/classes/Operation.html#promise
    // operation emits 'progress', 'error' and 'complete'
    operation.on('progress', logProgress);
    const response = await operation.promise();
    const meta = response[1];
    const timeUsed =
      meta.common.endTime.seconds - meta.common.startTime.seconds;
    spinner.succeed(
      `Dumping finished ${meta?.progressEntities?.workCompleted?.toNumber()} records (${prettyBytes(
        meta?.progressBytes?.workCompleted?.toNumber()
      )}) in ${timeUsed}s`
    );
    return {
      outputUrl: response[0].outputUrl,
      operation,
      result: response,
    };
  } catch (error) {
    spinner.fail(error.message);
    throw error;
  }
}
/** Returns a list of all Namespaces in a Datastore for the current namespace.
 */

export async function getNamespaces(datastore: Datastore): Promise<string[]> {
  const query = datastore.createQuery('__namespace__').select('__key__');
  const [entities] = await datastore.runQuery(query);
  const namespaces = entities.map((entity) => entity[datastore.KEY].name);
  return namespaces;
}
/** Returns a list of all Kinds in a Datastore for the current namespace.
 *
 * Kinds where the name starts with `_` are suppressed.
 */
async function getKindNames(datastore: Datastore): Promise<string[]> {
  const query = datastore.createQuery('__kind__').select('__key__');
  const [entities] = await datastore.runQuery(query);
  const kinds = entities.map((entity) => entity[datastore.KEY].name);
  return kinds.filter((x) => !x.startsWith('_'));
}
