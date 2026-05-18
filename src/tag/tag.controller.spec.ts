import { Test, TestingModule } from '@nestjs/testing';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';

const mockTagService = () => ({
  findAll: jest.fn(),
});

describe('TagController', () => {
  let tagController: TagController;
  let tagService: jest.Mocked<TagService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagController],
      providers: [{ provide: TagService, useFactory: mockTagService }],
    }).compile();

    tagService = module.get(TagService);
    tagController = module.get<TagController>(TagController);
  });

  describe('findAll', () => {
    it('should return an array of tags', async () => {
      const tags = [
        { _id: '1', tag: 'angularjs' },
        { _id: '2', tag: 'reactjs' },
      ];

      tagService.findAll.mockResolvedValue(tags as any);

      const findAllResult = await tagController.findAll();
      expect(findAllResult).toBe(tags);
    });

    it('should return empty array when no tags exist', async () => {
      tagService.findAll.mockResolvedValue([]);

      const result = await tagController.findAll();
      expect(result).toEqual([]);
    });

    it('should propagate service errors', async () => {
      tagService.findAll.mockRejectedValue(new Error('Service unavailable'));

      await expect(tagController.findAll()).rejects.toThrow('Service unavailable');
    });
  });
});