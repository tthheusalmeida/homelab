import type { FilePicker } from '../ipc/file-picker';
import { IpcError, IpcErrorCode } from '../shared/errors';

import {
  MAX_MIND_MAP_IMAGE_BYTES,
  MindMapImageMessages,
  MindMapImageSaver,
  safePngName,
} from './mind-map-image-saver';

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const png = (extra = 'dados') => Buffer.concat([PNG_HEADER, Buffer.from(extra)]);

function setup(chosen: string | null = 'D:/Mapas/redes.png') {
  const picker: jest.Mocked<FilePicker> = {
    pickSavePath: jest.fn().mockResolvedValue(chosen),
    pickOpenPath: jest.fn(),
  };
  const write = jest.fn().mockResolvedValue(undefined);

  return { picker, write, saver: new MindMapImageSaver(picker, write) };
}

describe('MindMapImageSaver', () => {
  it('when the user picks a place, should write the decoded PNG there and answer the path', async () => {
    const { saver, write } = setup('D:/Mapas/redes.png');
    const data = png();

    await expect(saver.save('Mapa mental - Redes.png', data.toString('base64'))).resolves.toEqual({
      saved: true,
      path: 'D:/Mapas/redes.png',
    });
    expect(write).toHaveBeenCalledWith('D:/Mapas/redes.png', data);
  });

  it('when asking where to save, should suggest the file name and filter by PNG', async () => {
    const { saver, picker } = setup();

    await saver.save('Mapa mental - Redes', png().toString('base64'));

    expect(picker.pickSavePath).toHaveBeenCalledWith({
      defaultPath: 'Mapa mental - Redes.png',
      filters: [{ name: 'Imagem PNG', extensions: ['png'] }],
    });
  });

  it('when the user types a name without extension, should add .png', async () => {
    const { saver, write } = setup('D:/Mapas/redes');

    await expect(saver.save('x', png().toString('base64'))).resolves.toMatchObject({
      path: 'D:/Mapas/redes.png',
    });
    expect(write).toHaveBeenCalledWith('D:/Mapas/redes.png', expect.any(Buffer));
  });

  it('when the user closes the dialog, should answer saved false and write nothing', async () => {
    const { saver, write } = setup(null);

    await expect(saver.save('x', png().toString('base64'))).resolves.toEqual({ saved: false });
    expect(write).not.toHaveBeenCalled();
  });

  it('when the content is not a PNG, should answer VALIDATION before opening the dialog', async () => {
    const { saver, picker } = setup();

    const failure = saver.save('x', Buffer.from('isso não é uma imagem').toString('base64'));

    await expect(failure).rejects.toMatchObject({ code: IpcErrorCode.VALIDATION });
    await expect(failure).rejects.toThrow(MindMapImageMessages.invalid);
    expect(picker.pickSavePath).not.toHaveBeenCalled();
  });

  it('when the content is empty or too short, should answer VALIDATION', async () => {
    const { saver } = setup();

    await expect(saver.save('x', '')).rejects.toBeInstanceOf(IpcError);
    await expect(
      saver.save('x', Buffer.from([0x89, 0x50]).toString('base64')),
    ).rejects.toMatchObject({
      code: IpcErrorCode.VALIDATION,
    });
  });

  it('when the image is bigger than the limit, should answer VALIDATION', async () => {
    const { saver, picker } = setup();
    const big = Buffer.concat([PNG_HEADER, Buffer.alloc(MAX_MIND_MAP_IMAGE_BYTES)]);

    await expect(saver.save('x', big.toString('base64'))).rejects.toThrow(
      MindMapImageMessages.tooLarge,
    );
    expect(picker.pickSavePath).not.toHaveBeenCalled();
  });

  it('when writing fails, should answer PERSIST_FAILED with a friendly message', async () => {
    const { saver, write } = setup();

    write.mockRejectedValue(new Error('EACCES: permission denied'));

    const failure = saver.save('x', png().toString('base64'));

    await expect(failure).rejects.toMatchObject({ code: IpcErrorCode.PERSIST_FAILED });
    await expect(failure).rejects.toThrow(MindMapImageMessages.writeFailed);
  });
});

describe('safePngName', () => {
  it('when the name is fine, should keep it and make sure it ends with .png', () => {
    expect(safePngName('Mapa mental - Redes')).toBe('Mapa mental - Redes.png');
    expect(safePngName('Mapa.PNG')).toBe('Mapa.png');
  });

  it('when the name has characters not allowed in file names, should replace them', () => {
    expect(safePngName('Redes: camadas/TCP? "x" <y> |z|')).toBe('Redes camadas TCP x y z.png');
  });

  it('when the name is empty or only symbols, should use the default', () => {
    expect(safePngName('')).toBe('mapa-mental.png');
    expect(safePngName(' ... ')).toBe('mapa-mental.png');
    expect(safePngName('///')).toBe('mapa-mental.png');
  });

  it('when the name is too long, should cut it', () => {
    expect(safePngName('a'.repeat(300)).length).toBeLessThanOrEqual(104);
  });
});
