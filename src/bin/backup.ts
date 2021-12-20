#!/usr/bin/env ts-node
/*
 * backup.ts
 *
 * Created by Dr. Maximillian Dornseif 2021-12-21 in datastore-backup 1.0.0
 * Copyright (c) 2021 Dr. Maximillian Dornseif
 */
import { Datastore } from '@google-cloud/datastore';
import { ArgumentParser } from 'argparse';
import ora from 'ora';

import { dumpAllKinds } from '../lib/datastore-backup';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../../package.json');

const parser = new ArgumentParser({
  description: 'Backup Datastore.',
  epilog:
    'Please provide `GOOGLE_APPLICATION_CREDENTIALS` via the Environment!',
  add_help: true,
});

parser.add_argument('-v', '--version', { action: 'version', version });
parser.add_argument('projectId', { help: 'Datastore project ID' });
parser.add_argument('bucket', { help: 'GCS bucket to store backup' });
parser.add_argument('-d', '--backupDir', {
  default: 'bak',
  help: 'prefix/dir within bucket (default: "%(default)s)"',
});
parser.add_argument('-n', '--backupName', {
  help: 'name of backup (default: autogenerated)',
});
parser.add_argument('-s', '--namespace', { help: 'datastore namespace' });

const args = parser.parse_args();
async function main() {
  const datastore = new Datastore({
    projectId: args.projectId,
    namespace: args.namespace,
  }); //);
  //

  const spinner = ora().start('🌈 Unicorns! ✨🌈');

  await dumpAllKinds(
    datastore,
    args.bucket,
    args.backupName,
    args.backupDir,
    spinner
  );

  return '';
}

main().then(console.log).catch(console.error);