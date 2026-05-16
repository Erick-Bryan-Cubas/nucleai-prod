import { DeployService } from '../deployService';
import { DeployStatusEnum } from '@server/repositories/deployLogRepository';

describe('DeployService', () => {
  let mockWrenAIAdaptor;

  let mockDeployLogRepository;
  let deployService;
  let mockTelemetry;

  beforeEach(() => {
    mockTelemetry = { sendEvent: jest.fn() };
    mockWrenAIAdaptor = { deploy: jest.fn() };
    mockDeployLogRepository = {
      findLastProjectDeployLog: jest.fn(),
      createOne: jest.fn(),
      updateOne: jest.fn(),
    };

    deployService = new DeployService({
      telemetry: mockTelemetry,
      wrenAIAdaptor: mockWrenAIAdaptor,
      deployLogRepository: mockDeployLogRepository,
    });
  });

  it('should successfully deploy when there is no existing deployment with the same hash', async () => {
    const manifest = { key: 'value' };
    const projectId = 1;

    mockDeployLogRepository.findLastProjectDeployLog.mockResolvedValue(null);
    mockWrenAIAdaptor.deploy.mockResolvedValue({ status: 'SUCCESS' });
    mockDeployLogRepository.createOne.mockResolvedValue({ id: 123 });

    const response = await deployService.deploy(manifest, projectId);

    expect(response.status).toEqual(DeployStatusEnum.SUCCESS);
    expect(mockDeployLogRepository.updateOne).toHaveBeenCalledWith(123, {
      status: DeployStatusEnum.SUCCESS,
      error: undefined,
    });
  });

  it('should return failed status if ai-service deployment fails', async () => {
    const manifest = { key: 'value' };
    const projectId = 1;

    mockDeployLogRepository.findLastProjectDeployLog.mockResolvedValue(null);
    mockWrenAIAdaptor.deploy.mockResolvedValue({
      status: 'FAILED',
      error: 'AI error',
    });
    mockDeployLogRepository.createOne.mockResolvedValue({ id: 123 });

    const response = await deployService.deploy(manifest, projectId);

    expect(response.status).toEqual(DeployStatusEnum.FAILED);
    expect(response.error).toEqual('AI error');
  });

  it('should skip deployment if an existing deployment with the same hash exists', async () => {
    const manifest = { key: 'value' };
    const projectId = 1;

    mockDeployLogRepository.findLastProjectDeployLog.mockResolvedValue({
      hash: deployService.createMDLHash(manifest, 1),
    });

    const response = await deployService.deploy(manifest, projectId);

    expect(response.status).toEqual(DeployStatusEnum.SUCCESS);
    expect(mockWrenAIAdaptor.deploy).not.toHaveBeenCalled();
  });

  it('should adopt new hash without calling ai-service when skipAiReindex is true and a previous deploy exists', async () => {
    const manifest = { key: 'value' };
    const projectId = 1;

    mockDeployLogRepository.findLastProjectDeployLog.mockResolvedValue({
      hash: 'previous-hash-different-from-current',
    });
    mockDeployLogRepository.createOne.mockResolvedValue({ id: 999 });

    const response = await deployService.deploy(manifest, projectId, {
      skipAiReindex: true,
    });

    expect(response.status).toEqual(DeployStatusEnum.SUCCESS);
    expect(mockWrenAIAdaptor.deploy).not.toHaveBeenCalled();
    expect(mockDeployLogRepository.createOne).toHaveBeenCalledWith(
      expect.objectContaining({ status: DeployStatusEnum.SUCCESS, projectId }),
    );
    expect(mockDeployLogRepository.updateOne).not.toHaveBeenCalled();
  });

  it('should refuse to skip reindex on first deploy (no previous deploy_log row)', async () => {
    const manifest = { key: 'value' };
    const projectId = 1;

    mockDeployLogRepository.findLastProjectDeployLog.mockResolvedValue(null);

    const response = await deployService.deploy(manifest, projectId, {
      skipAiReindex: true,
    });

    expect(response.status).toEqual(DeployStatusEnum.FAILED);
    expect(response.error).toMatch(/first deploy/i);
    expect(mockWrenAIAdaptor.deploy).not.toHaveBeenCalled();
    expect(mockDeployLogRepository.createOne).not.toHaveBeenCalled();
  });

  it('force=true overrides skipAiReindex and triggers real deploy', async () => {
    const manifest = { key: 'value' };
    const projectId = 1;

    mockDeployLogRepository.findLastProjectDeployLog.mockResolvedValue({
      hash: deployService.createMDLHash(manifest, projectId),
    });
    mockWrenAIAdaptor.deploy.mockResolvedValue({ status: 'SUCCESS' });
    mockDeployLogRepository.createOne.mockResolvedValue({ id: 777 });

    const response = await deployService.deploy(manifest, projectId, {
      force: true,
      skipAiReindex: true,
    });

    expect(response.status).toEqual(DeployStatusEnum.SUCCESS);
    expect(mockWrenAIAdaptor.deploy).toHaveBeenCalled();
  });
});
