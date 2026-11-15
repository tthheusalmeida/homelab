import { DialogFilePicker, type FileDialogs } from './file-picker';

const zip = [{ name: 'Backup do HomeLab', extensions: ['zip'] }];

const dialogs = (): jest.Mocked<FileDialogs> => ({ showSave: jest.fn(), showOpen: jest.fn() });

describe('DialogFilePicker', () => {
  it('when the user picks where to save, should answer the chosen path and pass the options on', async () => {
    const native = dialogs();
    native.showSave.mockResolvedValue({ canceled: false, filePath: 'D:/backup.zip' });

    await expect(
      new DialogFilePicker(native).pickSavePath({ defaultPath: 'backup.zip', filters: zip }),
    ).resolves.toBe('D:/backup.zip');
    expect(native.showSave).toHaveBeenCalledWith({ defaultPath: 'backup.zip', filters: zip });
  });

  it('when the save dialog is cancelled, should answer null', async () => {
    const native = dialogs();
    native.showSave.mockResolvedValue({ canceled: true });

    await expect(new DialogFilePicker(native).pickSavePath({ filters: zip })).resolves.toBeNull();
  });

  it('when the save dialog answers without a path, should answer null', async () => {
    const native = dialogs();
    native.showSave.mockResolvedValue({ canceled: false });

    await expect(new DialogFilePicker(native).pickSavePath({ filters: zip })).resolves.toBeNull();
  });

  it('when the user picks a file to open, should answer the first chosen path', async () => {
    const native = dialogs();
    native.showOpen.mockResolvedValue({ canceled: false, filePaths: ['D:/a.zip', 'D:/b.zip'] });

    await expect(new DialogFilePicker(native).pickOpenPath({ filters: zip })).resolves.toBe(
      'D:/a.zip',
    );
    expect(native.showOpen).toHaveBeenCalledWith({ filters: zip });
  });

  it('when the open dialog is cancelled or returns nothing, should answer null', async () => {
    const native = dialogs();
    const picker = new DialogFilePicker(native);

    native.showOpen.mockResolvedValueOnce({ canceled: true, filePaths: [] });
    native.showOpen.mockResolvedValueOnce({ canceled: false, filePaths: [] });

    await expect(picker.pickOpenPath({ filters: zip })).resolves.toBeNull();
    await expect(picker.pickOpenPath({ filters: zip })).resolves.toBeNull();
  });
});
