[Exporting Data from Google Cloud Datastore](https://cloud.google.com/datastore/docs/export-import-entities#rest) seems easy:

[From the command line](https://cloud.google.com/sdk/gcloud/reference/datastore/export):

```
gcloud datastore export gs://exampleBucket/backupdir

```

Or in node.js:

```js
const datastore = new Datastore();
datastore.export({ outputUrlPrefix: 'gs://exampleBucket/backupdir' });
```

So why do you need a library for that? Because it is in the details!

For one thing the code above contains an export containing all kinds [can not be loaded into BigQuery](https://cloud.google.com/bigquery/docs/loading-data-cloud-datastore): Data exported without specifying an entity filter cannot be loaded into BigQuery."

So you need a list of all Kinds in the Datastore. But there are [Limits on entity filters](https://cloud.google.com/datastore/docs/export-import-entities#entity_filter): "Each request is limited to 100 entity filter combinations, where each combination of filtered kind and namespace counts as a separate filter towards this limit." (It was 50 e few years before.)

And there is [an other limit](https://cloud.google.com/datastore/docs/export-import-entities): "The managed export and import service limits the number of concurrent exports and imports to 50 and allows a maximum of 20 export and import requests per minute for a project."

So if you have a lot of entities you have to do some slicing and dicing.

## CLI Usage

Command line usage is simple. You have to provide the projectId of the datastore and a bucket name. Both have to be in the same region.

```
% yarn ts-node src/bin/backup.ts --help
usage: backup.ts [-h] [-v] [-d BACKUPDIR] [-n BACKUPNAME] [-s NAMESPACE] projectId bucket

Backup Datastore.

positional arguments:
  projectId             Datastore project ID
  bucket                GCS bucket to store backup

optional arguments:
  -h, --help            show this help message and exit
  -d BACKUPDIR, --backupDir BACKUPDIR
                        prefix/dir within bucket
  -n BACKUPNAME, --backupName BACKUPNAME
                        name of backup (default: auto-generated)
  -s NAMESPACE, --namespace NAMESPACE
                        datastore namespace

Please provide `GOOGLE_APPLICATION_CREDENTIALS` via the Environment!
```

```
% export GOOGLE_APPLICATION_CREDENTIALS=~/sampleproj-b0a74af0545e.json
% yarn ts-node src/bin/backup.ts sampleproj sampleproj-tmp
ℹ backup to gs://sampleproj-tmp/bak/20211221T212651-sampleproj
ℹ Dumping datastore sampleproj
✔ 2 Kinds
2 kinds  ℹ Dumping NumberingAncestor, NumberingItem
2 kinds  ℹ Dumping to gs://sampleproj-tmp/bak/20211221T212651-sampleproj-0
2 kinds  ✔ Dumping finished 27150 records (4.04 MB) in 51s
2 kinds  ✔ written gs://sampleproj-tmp/bak/20211221T212651-sampleproj-0/20211221T212651-sampleproj-0.overall_export_metadata
✨  Done in 54.16s.
```

This generates a single folder structure under `gs://sampleproj-tmp/bak/20211221T212651-sampleproj-0`. For projects with more than 100 entities more folders will be generated.

There is one subfolder per kind containing the Entities encoded in [LevelDB Format](https://github.com/google/leveldb).

## Programmatic Usage

```
import { Datastore } from '@google-cloud/datastore';
import { dumpAllKinds } from '../lib/datastore-backup';

await dumpAllKinds(new Datastore({ projectId: 'sampleproj' }), 'sampleproj-tmp')
```

# See also

- [datastore-to-bigquery](https://www.npmjs.com/package/datastore-to-bigquery) to load the data produced by this module into BigQuery.
- [Google DatastoreImport/Export Documentation](https://cloud.google.com/datastore/docs/export-import-entities#rest)
- [node.js low-level Datastore export API](https://googleapis.dev/nodejs/datastore/latest/google.datastore.admin.v1.DatastoreAdmin.html#exportEntities2)
- [firestore-to-bigquery-export npm module](https://www.npmjs.com/package/@pokutuna/firestore-to-bigquery) for Cloud Functions
- [firestore-to-bigquery-export npm module](https://www.npmjs.com/package/firestore-to-bigquery-export) an other one wth some documentation
