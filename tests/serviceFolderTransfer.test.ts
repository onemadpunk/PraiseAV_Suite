import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceTransferFileName, writeServiceToFolder } from '../src/utils/serviceFolderTransfer';
import type { PraiseAVServiceFile } from '../src/utils/praiseavService';

const service: PraiseAVServiceFile = {
  format: 'praiseav-service', version: 1, id: 'plan-1', name: 'Sunday',
  date: '2026-11-08', startTime: '10:00', endTime: '', notices: '',
  items: [], songs: {}, media: [],
};

function fakeDirectory() {
  const files = new Map<string, string>();
  const directory = {
    async getFileHandle(name: string, options?: { create?: boolean }) {
      if (!files.has(name) && !options?.create) throw new DOMException('Missing', 'NotFoundError');
      if (!files.has(name)) files.set(name, '');
      return {
        async getFile() { return { text: async () => files.get(name) || '' }; },
        async createWritable() {
          let pending = files.get(name) || '';
          return {
            async write(text: string) { pending = text; },
            async close() { files.set(name, pending); },
            async abort() {},
          };
        },
      };
    },
  } as unknown as FileSystemDirectoryHandle;
  return { directory, files };
}

test('transfer creates a desktop service file, then recognises an unchanged repeat', async () => {
  const { directory, files } = fakeDirectory();
  const first = await writeServiceToFolder(directory, service);
  assert.equal(first.unchanged, false);
  assert.equal(JSON.parse(files.get(first.fileName)!).id, service.id);
  const repeat = await writeServiceToFolder(directory, service, first.hash);
  assert.equal(repeat.unchanged, true);
});

test('transfer updates its own file but refuses a desktop edit or another service', async () => {
  const { directory, files } = fakeDirectory();
  const first = await writeServiceToFolder(directory, service);
  const update = await writeServiceToFolder(directory, { ...service, name: 'Sunday Morning' }, first.hash);
  assert.equal(update.unchanged, false);
  files.set(update.fileName, JSON.stringify({ ...service, name: 'Edited in PraiseAV' }));
  await assert.rejects(writeServiceToFolder(directory, { ...service, name: 'Sunday Evening' }, update.hash), /changed outside/);
  assert.equal(JSON.parse(files.get(update.fileName)!).name, 'Edited in PraiseAV');
  files.set(update.fileName, JSON.stringify({ ...service, id: 'another-plan' }));
  await assert.rejects(writeServiceToFolder(directory, service, update.hash), /not this service/);
});

test('transfer filename is stable for a service id', () => {
  assert.equal(serviceTransferFileName('plan-1'), 'PraiseAV Suite plan-1.praiseav');
  assert.equal(serviceTransferFileName('plan-1'), serviceTransferFileName('plan-1'));
});
