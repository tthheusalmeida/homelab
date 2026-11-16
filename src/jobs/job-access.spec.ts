import { JobAccess, JobAccessMessages } from './job-access';

describe('JobAccess', () => {
  it('when the job waits for access, should open the login window for its link', async () => {
    const openLogin = jest.fn().mockResolvedValue(true);
    const access = new JobAccess(
      { get: () => ({ accessUrl: 'https://curso.edu/aula/1' }) },
      { openLogin },
    );

    await expect(access.grantAccess('j1')).resolves.toEqual({ id: 'j1', granted: true });
    expect(openLogin).toHaveBeenCalledWith('https://curso.edu/aula/1');
  });

  it('when the window is closed without signing in, should report that access was not granted', async () => {
    const access = new JobAccess(
      { get: () => ({ accessUrl: 'https://curso.edu/aula/1' }) },
      { openLogin: async () => false },
    );

    await expect(access.grantAccess('j1')).resolves.toEqual({ id: 'j1', granted: false });
  });

  it('when the job is not waiting for access, should answer VALIDATION without opening a window', async () => {
    const openLogin = jest.fn();
    const access = new JobAccess({ get: () => ({}) }, { openLogin });

    await expect(access.grantAccess('j1')).rejects.toMatchObject({
      code: 'VALIDATION',
      message: JobAccessMessages.notWaiting,
    });
    expect(openLogin).not.toHaveBeenCalled();
  });

  it('when the job does not exist, should let the not-found error through', async () => {
    const access = new JobAccess(
      {
        get: () => {
          throw new Error('não existe');
        },
      },
      { openLogin: jest.fn() },
    );

    await expect(access.grantAccess('x')).rejects.toThrow('não existe');
  });
});
