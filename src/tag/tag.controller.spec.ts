import { Test, TestingModule } from '@nestjs/testing';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';
import { TagEntity } from './tag.entity';

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
      const tags: TagEntity[] = [];
      const createTag = (id, name) => {
        const tag = new TagEntity();
        tag.id = id;
        tag.tag = name;
        return tag;
      };
      tags.push(createTag(1, 'angularjs'));
      tags.push(createTag(2, 'reactjs'));

      tagService.findAll.mockResolvedValue(tags);

      const findAllResult = await tagController.findAll();
      expect(findAllResult).toBe(tags);
    });

    it('should return empty array when no tags exist', async () => {
      tagService.findAll.mockResolvedValue([]);

      const result = await tagController.findAll();
      expect(result).toEqual([]);
    });
  });
});