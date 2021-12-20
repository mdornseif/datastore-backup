/*
 * backup.ts
 *
 * Created by Dr. Maximillian Dornseif 2021-12-20 in datastore-backup 1.0.0
 * Copyright (c) 2021 HUDORA GmbH
 */

import { Datastore } from '@google-cloud/datastore';

const datastore = new Datastore();

async function runNamespaceQuery() {
  const query = datastore.createQuery('__namespace__').select('__key__');

  const [entities] = await datastore.runQuery(query);
  const namespaces = entities.map((entity) => entity[datastore.KEY].name);

  console.log('Namespaces:');
  namespaces.forEach((namespace) => console.log(namespace));

  return namespaces;
}
async function runKindQuery() {
  const query = datastore.createQuery('__kind__').select('__key__');

  const [entities] = await datastore.runQuery(query);
  const kinds = entities.map((entity) => entity[datastore.KEY].name);

  console.log('Kinds:');
  kinds.forEach((kind) => console.log(kind));

  return kinds.filter((x) => !x.startsWith('__'));
}

async function main() {
  await runNamespaceQuery();
  const kindNames = await runKindQuery();
  // https://cloud.google.com/datastore/docs/reference/admin/rest/v1/projects/export
  const [operation] = await datastore.export({
    // bucket: {
    //   name: 'hudora-tmp',
    // },
    outputUrlPrefix: 'gs://hudora-tmp/foo',
    kinds: kindNames,
  });
  console.log(operation);
  console.log(operation.done);
  console.log(operation.metadata);
  const response = await operation.promise();
  console.log('finished', response);
  console.log('operation', operation);
}

main().then(console.log).catch(console.error);
