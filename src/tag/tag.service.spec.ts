import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagService } from './tag.service';
import { TagEntity } from './tag.entity';

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});

describe('TagService', () => {
  let service: TagService;
  let tagRepository: jest.Mocked<Repository<TagEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagService,
        { provide: getRepositoryToken(TagEntity), useFactory: mockRepository },
      ],
    }).compile();

    service = module.get<TagService>(TagService);
    tagRepository = module.get(getRepositoryToken(TagEntity));
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should return an array of all tags', async () => {
      const tags: TagEntity[] = [
        { id: 1, tag: 'nestjs' } as TagEntity,
        { id: 2, tag: 'typescript' } as TagEntity,
        { id: 3, tag: 'testing' } as TagEntity,
      ];
      tagRepository.find.mockResolvedValue(tags);

      const result = await service.findAll();

      expect(result).toEqual(tags);
      expect(result).toHaveLength(3);
      expect(tagRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array when no tags exist', async () => {
      tagRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });
});
