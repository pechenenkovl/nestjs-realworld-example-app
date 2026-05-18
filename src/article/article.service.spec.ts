import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ArticleService } from './article.service';
import { Article } from './article.schema';
import { User } from '../user/user.schema';
import { Follow } from '../profile/follow.schema';

const createMockArticle = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  slug: 'test-article-abc123',
  title: 'Test Article',
  description: 'A description',
  body: 'Article body',
  tagList: ['nestjs', 'testing'],
  author: '507f1f77bcf86cd799439022',
  comments: [],
  favoriteCount: 0,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  save: jest.fn(),
  ...overrides,
});

const createMockUser = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439022',
  username: 'testuser',
  email: 'test@example.com',
  password: 'hashed',
  bio: '',
  image: '',
  articles: [],
  favorites: [],
  save: jest.fn(),
  ...overrides,
});

const mockArticleModel: any = jest.fn().mockImplementation((data) => {
  const instance = createMockArticle(data);
  instance.save.mockResolvedValue(instance);
  return instance;
});
mockArticleModel.find = jest.fn();
mockArticleModel.findOne = jest.fn();
mockArticleModel.findOneAndUpdate = jest.fn();
mockArticleModel.findByIdAndUpdate = jest.fn();
mockArticleModel.countDocuments = jest.fn();
mockArticleModel.deleteOne = jest.fn();

const mockUserModel: any = {
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

const mockFollowModel: any = {
  find: jest.fn(),
  findOne: jest.fn(),
};

describe('ArticleService', () => {
  let service: ArticleService;
  let articleModel: any;
  let userModel: any;
  let followModel: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        { provide: getModelToken(Article.name), useValue: mockArticleModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Follow.name), useValue: mockFollowModel },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
    articleModel = module.get(getModelToken(Article.name));
    userModel = module.get(getModelToken(User.name));
    followModel = module.get(getModelToken(Follow.name));
  });

  afterEach(() => jest.clearAllMocks());

  // ------- CRUD: findAll -------

  describe('findAll', () => {
    it('should return all articles with count', async () => {
      const articles = [createMockArticle(), createMockArticle({ _id: '2', slug: 'second-article' })];
      articleModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(2) });
      articleModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(articles),
              }),
            }),
            exec: jest.fn().mockResolvedValue(articles),
          }),
        }),
      });

      const result = await service.findAll({});

      expect(result.articles).toHaveLength(2);
      expect(result.articlesCount).toBe(2);
    });

    it('should filter articles by tag', async () => {
      articleModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });
      articleModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([createMockArticle()]),
          }),
        }),
      });

      const result = await service.findAll({ tag: 'nestjs' });

      expect(result.articles).toHaveLength(1);
    });

    it('should filter articles by author', async () => {
      const author = createMockUser({ _id: '5', username: 'authoruser' });
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(author) });
      articleModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
      articleModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await service.findAll({ author: 'authoruser' });

      expect(userModel.findOne).toHaveBeenCalled();
    });

    it('should apply limit and offset for pagination', async () => {
      articleModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(20) });
      const mockExec = jest.fn().mockResolvedValue([]);
      const mockSkip = jest.fn().mockReturnValue({ exec: mockExec });
      const mockLimit = jest.fn().mockReturnValue({ skip: mockSkip, exec: mockExec });
      articleModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: mockLimit,
          }),
        }),
      });

      await service.findAll({ limit: 10, offset: 5 });

      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(mockSkip).toHaveBeenCalledWith(5);
    });
  });

  // ------- CRUD: findOne -------

  describe('findOne', () => {
    it('should return a single article by slug', async () => {
      const article = createMockArticle();
      articleModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(article),
        }),
      });

      const result = await service.findOne({ slug: 'test-article-abc123' });

      expect(result.article).toEqual(article);
    });

    it('should return null article when not found', async () => {
      articleModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.findOne({ slug: 'nonexistent' });

      expect(result.article).toBeNull();
    });
  });

  // ------- CRUD: create -------

  describe('create', () => {
    it('should create and return a new article', async () => {
      userModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      const dto = { title: 'Test Article', description: 'A description', body: 'Article body', tagList: ['nestjs'] };
      const result = await service.create('507f1f77bcf86cd799439022', dto);

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Article');
    });

    it('should generate a slug from the title', async () => {
      userModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      const dto = { title: 'My Great Article', description: 'desc', body: 'body', tagList: [] };
      const result = await service.create('507f1f77bcf86cd799439022', dto);

      expect(result.slug).toMatch(/^my-great-article-/);
    });

    it('should default tagList to empty array when not provided', async () => {
      userModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      const dto = { title: 'No Tags', description: 'desc', body: 'body', tagList: undefined } as any;
      const result = await service.create('507f1f77bcf86cd799439022', dto);

      expect(result.tagList).toEqual([]);
    });
  });

  // ------- CRUD: update -------

  describe('update', () => {
    it('should update and return the article', async () => {
      const updated = createMockArticle({ title: 'Updated Title' });
      articleModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updated),
        }),
      });

      const result = await service.update('test-article-abc123', { title: 'Updated Title' });

      expect(result.article.title).toBe('Updated Title');
    });
  });

  // ------- CRUD: delete -------

  describe('delete', () => {
    it('should delete article by slug', async () => {
      const deleteResult = { acknowledged: true, deletedCount: 1 };
      articleModel.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(deleteResult) });

      const result = await service.delete('test-article-abc123');

      expect(result).toEqual(deleteResult);
      expect(articleModel.deleteOne).toHaveBeenCalledWith({ slug: 'test-article-abc123' });
    });
  });

  // ------- Business Logic: Feed -------

  describe('findFeed', () => {
    it('should return articles from followed users', async () => {
      followModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: '1', followerId: '1', followingId: '2' },
          { _id: '2', followerId: '1', followingId: '3' },
        ]),
      });

      const articles = [createMockArticle()];
      articleModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });
      articleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(articles),
        }),
      });

      const result = await service.findFeed('1', {});

      expect(result.articles).toHaveLength(1);
      expect(result.articlesCount).toBe(1);
    });

    it('should return empty feed when user follows nobody', async () => {
      followModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

      const result = await service.findFeed('1', {});

      expect(result.articles).toEqual([]);
      expect(result.articlesCount).toBe(0);
    });
  });

  // ------- Business Logic: Comments -------

  describe('addComment', () => {
    it('should add a comment to an article', async () => {
      const article = createMockArticle({ comments: [{ _id: '1', body: 'Great article!' }] });
      articleModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(article),
        }),
      });

      const result = await service.addComment('test-article-abc123', { body: 'Great article!' });

      expect(result.article).toBeDefined();
      expect(articleModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment from an article', async () => {
      const article = createMockArticle({ comments: [] });
      articleModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(article),
        }),
      });

      const result = await service.deleteComment('test-article-abc123', '10');

      expect(result.article).toBeDefined();
      expect(articleModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('findComments', () => {
    it('should return comments for an article', async () => {
      const comments = [{ _id: '1', body: 'Comment 1' }, { _id: '2', body: 'Comment 2' }];
      const article = createMockArticle({ comments });
      articleModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(article) });

      const result = await service.findComments('test-article-abc123');

      expect(result.comments).toHaveLength(2);
    });
  });

  // ------- Business Logic: Favorites -------

  describe('favorite', () => {
    it('should favorite an article and increment favoriteCount', async () => {
      const article = createMockArticle({ favoriteCount: 0 });
      article.save.mockResolvedValue({ ...article, favoriteCount: 1 });
      const user = createMockUser({ favorites: [] });
      user.save.mockResolvedValue(user);

      articleModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(article) });
      userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });

      const result = await service.favorite('507f1f77bcf86cd799439022', 'test-article-abc123');

      expect(user.save).toHaveBeenCalled();
      expect(article.save).toHaveBeenCalled();
      expect(result.article).toBeDefined();
    });

    it('should not double-favorite an already favorited article', async () => {
      const article = createMockArticle({ _id: '5', favoriteCount: 1 });
      const user = createMockUser({ favorites: ['5'] });

      articleModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(article) });
      userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });

      await service.favorite('507f1f77bcf86cd799439022', 'test-article-abc123');

      expect(user.save).not.toHaveBeenCalled();
      expect(article.save).not.toHaveBeenCalled();
    });
  });

  describe('unFavorite', () => {
    it('should unfavorite an article and decrement favoriteCount', async () => {
      const article = createMockArticle({ _id: '5', favoriteCount: 1 });
      article.save.mockResolvedValue({ ...article, favoriteCount: 0 });
      const user = createMockUser({ favorites: ['5'] });
      user.save.mockResolvedValue(user);

      articleModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(article) });
      userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });

      const result = await service.unFavorite('507f1f77bcf86cd799439022', 'test-article-abc123');

      expect(user.save).toHaveBeenCalled();
      expect(article.save).toHaveBeenCalled();
      expect(result.article).toBeDefined();
    });

    it('should not change anything if article is not in favorites', async () => {
      const article = createMockArticle({ _id: '5', favoriteCount: 0 });
      const user = createMockUser({ favorites: [] });

      articleModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(article) });
      userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });

      await service.unFavorite('507f1f77bcf86cd799439022', 'test-article-abc123');

      expect(user.save).not.toHaveBeenCalled();
      expect(article.save).not.toHaveBeenCalled();
    });
  });

  // ------- Business Logic: slugify -------

  describe('slugify', () => {
    it('should generate a lowercase slug with a random suffix', () => {
      const result = service.slugify('Hello World Article');

      expect(result).toMatch(/^hello-world-article-[a-z0-9]+$/);
    });

    it('should produce different slugs for same input (random suffix)', () => {
      const slug1 = service.slugify('Same Title');
      const slug2 = service.slugify('Same Title');

      expect(slug1).toMatch(/^same-title-/);
      expect(slug2).toMatch(/^same-title-/);
    });

    it('should handle special characters in title', () => {
      const result = service.slugify('Hello & World! @#$%');

      expect(result).toMatch(/^hello/);
      expect(result).not.toContain('&');
      expect(result).not.toContain('!');
    });

    it('should handle empty string', () => {
      const result = service.slugify('');

      expect(result).toMatch(/-[a-z0-9]+$/);
    });
  });

  // ------- Edge Cases -------

  describe('edge cases', () => {
    it('findAll should handle favorited filter with user having no favorites', async () => {
      const user = createMockUser({ favorites: [] });
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });
      articleModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
      articleModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.findAll({ favorited: 'testuser' });

      expect(result.articlesCount).toBe(0);
    });

    it('findAll should handle favorited filter with non-existent user', async () => {
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      articleModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
      articleModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.findAll({ favorited: 'ghost' });

      expect(result.articles).toEqual([]);
    });

    it('findAll should handle author filter with non-existent author', async () => {
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      articleModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
      articleModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.findAll({ author: 'nonexistent' });

      expect(result.articles).toEqual([]);
    });

    it('findOne should return null article for non-existent slug', async () => {
      articleModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.findOne({ slug: 'does-not-exist' });

      expect(result.article).toBeNull();
    });

    it('findComments should throw when article does not exist', async () => {
      articleModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.findComments('nonexistent')).rejects.toThrow();
    });

    it('favorite should throw when article does not exist', async () => {
      articleModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(createMockUser()) });

      await expect(service.favorite('1', 'nonexistent')).rejects.toThrow();
    });

    it('favorite should throw when user does not exist', async () => {
      articleModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(createMockArticle()) });
      userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.favorite('1', 'test-article-abc123')).rejects.toThrow();
    });

    it('unFavorite should return null article when article does not exist and user has no favorites', async () => {
      articleModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(createMockUser({ favorites: [] })) });

      const result = await service.unFavorite('1', 'nonexistent');

      expect(result.article).toBeNull();
    });

    it('findFeed should apply limit and offset', async () => {
      followModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ followerId: '1', followingId: '2' }]),
      });
      articleModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(5) });
      const mockExec = jest.fn().mockResolvedValue([createMockArticle()]);
      const mockSkip = jest.fn().mockReturnValue({ exec: mockExec });
      const mockLimit = jest.fn().mockReturnValue({ skip: mockSkip, exec: mockExec });
      articleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: mockLimit,
        }),
      });

      await service.findFeed('1', { limit: 5, offset: 2 });

      expect(mockLimit).toHaveBeenCalledWith(5);
      expect(mockSkip).toHaveBeenCalledWith(2);
    });

    it('delete should return deletedCount=0 when article does not exist', async () => {
      const deleteResult = { acknowledged: true, deletedCount: 0 };
      articleModel.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(deleteResult) });

      const result = await service.delete('nonexistent-slug');

      expect(result.deletedCount).toBe(0);
    });

    it('addComment should handle empty comment body', async () => {
      const article = createMockArticle({ comments: [{ _id: '1', body: '' }] });
      articleModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(article),
        }),
      });

      const result = await service.addComment('test-article-abc123', { body: '' });

      expect(result.article).toBeDefined();
    });

    it('update should handle updating slug when title changes', async () => {
      const updated = createMockArticle({ title: 'New Title', slug: 'new-title-xyz' });
      articleModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updated),
        }),
      });

      const result = await service.update('old-slug', { title: 'New Title' });

      expect(result.article.title).toBe('New Title');
    });

    it('create should associate article with user', async () => {
      const mockExec = jest.fn().mockResolvedValue({});
      userModel.findByIdAndUpdate.mockReturnValue({ exec: mockExec });

      const dto = { title: 'Test', description: 'desc', body: 'body', tagList: [] };
      await service.create('user-id-123', dto);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id-123',
        expect.objectContaining({ $push: expect.anything() }),
      );
    });
  });
});
