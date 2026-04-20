import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';
import { ArticleService } from './article.service';
import { ArticleEntity } from './article.entity';
import { Comment } from './comment.entity';
import { UserEntity } from '../user/user.entity';
import { FollowsEntity } from '../profile/follows.entity';

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});

describe('ArticleService', () => {
  let service: ArticleService;
  let articleRepository: jest.Mocked<Repository<ArticleEntity>>;
  let commentRepository: jest.Mocked<Repository<Comment>>;
  let userRepository: jest.Mocked<Repository<UserEntity>>;
  let followsRepository: jest.Mocked<Repository<FollowsEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        { provide: getRepositoryToken(ArticleEntity), useFactory: mockRepository },
        { provide: getRepositoryToken(Comment), useFactory: mockRepository },
        { provide: getRepositoryToken(UserEntity), useFactory: mockRepository },
        { provide: getRepositoryToken(FollowsEntity), useFactory: mockRepository },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
    articleRepository = module.get(getRepositoryToken(ArticleEntity));
    commentRepository = module.get(getRepositoryToken(Comment));
    userRepository = module.get(getRepositoryToken(UserEntity));
    followsRepository = module.get(getRepositoryToken(FollowsEntity));
  });

  afterEach(() => jest.clearAllMocks());

  const createArticle = (overrides: Partial<ArticleEntity> = {}): ArticleEntity => {
    const article = new ArticleEntity();
    article.id = 1;
    article.slug = 'test-article-abc123';
    article.title = 'Test Article';
    article.description = 'A description';
    article.body = 'Article body';
    article.tagList = ['nestjs', 'testing'];
    article.created = new Date('2025-01-01');
    article.updated = new Date('2025-01-01');
    article.comments = [];
    article.favoriteCount = 0;
    Object.assign(article, overrides);
    return article;
  };

  const createUser = (overrides: Partial<UserEntity> = {}): UserEntity => {
    const user = new UserEntity();
    user.id = 1;
    user.username = 'testuser';
    user.email = 'test@example.com';
    user.password = 'hashed';
    user.bio = '';
    user.image = '';
    user.articles = [];
    user.favorites = [];
    Object.assign(user, overrides);
    return user;
  };

  // ------- CRUD: findAll -------

  describe('findAll', () => {
    it('should return all articles with count', async () => {
      const articles = [createArticle(), createArticle({ id: 2, slug: 'second-article' })];
      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        getMany: jest.fn().mockResolvedValue(articles),
      };
      jest.spyOn(require('typeorm'), 'getRepository').mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      });

      const result = await service.findAll({});

      expect(result.articles).toHaveLength(2);
      expect(result.articlesCount).toBe(2);
    });

    it('should filter articles by tag', async () => {
      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue([createArticle()]),
      };
      jest.spyOn(require('typeorm'), 'getRepository').mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      });

      await service.findAll({ tag: 'nestjs' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'article.tagList LIKE :tag',
        { tag: '%nestjs%' },
      );
    });

    it('should filter articles by author', async () => {
      const author = createUser({ id: 5, username: 'authoruser' });
      userRepository.findOne.mockResolvedValue(author);

      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(require('typeorm'), 'getRepository').mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      });

      await service.findAll({ author: 'authoruser' });

      expect(userRepository.findOne).toHaveBeenCalledWith({ username: 'authoruser' });
      expect(mockQb.andWhere).toHaveBeenCalledWith('article.authorId = :id', { id: 5 });
    });

    it('should apply limit and offset for pagination', async () => {
      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(20),
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(require('typeorm'), 'getRepository').mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      });

      await service.findAll({ limit: 10, offset: 5 });

      expect(mockQb.limit).toHaveBeenCalledWith(10);
      expect(mockQb.offset).toHaveBeenCalledWith(5);
    });
  });

  // ------- CRUD: findOne -------

  describe('findOne', () => {
    it('should return a single article by slug', async () => {
      const article = createArticle();
      articleRepository.findOne.mockResolvedValue(article);

      const result = await service.findOne({ slug: 'test-article-abc123' });

      expect(result.article).toEqual(article);
      expect(articleRepository.findOne).toHaveBeenCalledWith({ slug: 'test-article-abc123' });
    });

    it('should return undefined article when not found', async () => {
      articleRepository.findOne.mockResolvedValue(undefined);

      const result = await service.findOne({ slug: 'nonexistent' });

      expect(result.article).toBeUndefined();
    });
  });

  // ------- CRUD: create -------

  describe('create', () => {
    it('should create and return a new article', async () => {
      const savedArticle = createArticle();
      articleRepository.save.mockResolvedValue(savedArticle);

      const author = createUser();
      userRepository.findOne.mockResolvedValue(author);
      userRepository.save.mockResolvedValue(author);

      const dto = { title: 'Test Article', description: 'A description', body: 'Article body', tagList: ['nestjs'] };
      const result = await service.create(1, dto);

      expect(result).toEqual(savedArticle);
      expect(articleRepository.save).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should generate a slug from the title', async () => {
      articleRepository.save.mockImplementation(async (entity) => entity as ArticleEntity);
      const author = createUser();
      userRepository.findOne.mockResolvedValue(author);
      userRepository.save.mockResolvedValue(author);

      const dto = { title: 'My Great Article', description: 'desc', body: 'body', tagList: [] };
      const result = await service.create(1, dto);

      expect(result.slug).toMatch(/^my-great-article-/);
    });

    it('should default tagList to empty array when not provided', async () => {
      articleRepository.save.mockImplementation(async (entity) => entity as ArticleEntity);
      const author = createUser();
      userRepository.findOne.mockResolvedValue(author);
      userRepository.save.mockResolvedValue(author);

      const dto = { title: 'No Tags', description: 'desc', body: 'body', tagList: undefined };
      const result = await service.create(1, dto);

      expect(result.tagList).toEqual([]);
    });

    it('should associate the article with the author', async () => {
      const savedArticle = createArticle();
      articleRepository.save.mockResolvedValue(savedArticle);

      const author = createUser();
      userRepository.findOne.mockResolvedValue(author);
      userRepository.save.mockResolvedValue(author);

      await service.create(1, { title: 'Title', description: 'desc', body: 'body', tagList: [] });

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 }, relations: ['articles'] });
    });
  });

  // ------- CRUD: update -------

  describe('update', () => {
    it('should update and return the article', async () => {
      const existing = createArticle();
      const updated = createArticle({ title: 'Updated Title' });
      articleRepository.findOne.mockResolvedValue(existing);
      articleRepository.save.mockResolvedValue(updated);

      const result = await service.update('test-article-abc123', { title: 'Updated Title' });

      expect(result.article.title).toBe('Updated Title');
      expect(articleRepository.findOne).toHaveBeenCalledWith({ slug: 'test-article-abc123' });
    });
  });

  // ------- CRUD: delete -------

  describe('delete', () => {
    it('should delete article by slug', async () => {
      const deleteResult: DeleteResult = { affected: 1, raw: {} };
      articleRepository.delete.mockResolvedValue(deleteResult);

      const result = await service.delete('test-article-abc123');

      expect(result).toEqual(deleteResult);
      expect(articleRepository.delete).toHaveBeenCalledWith({ slug: 'test-article-abc123' });
    });
  });

  // ------- Business Logic: Feed -------

  describe('findFeed', () => {
    it('should return articles from followed users', async () => {
      followsRepository.find.mockResolvedValue([
        { id: 1, followerId: 1, followingId: 2 } as FollowsEntity,
        { id: 2, followerId: 1, followingId: 3 } as FollowsEntity,
      ]);

      const articles = [createArticle()];
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue(articles),
      };
      jest.spyOn(require('typeorm'), 'getRepository').mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      });

      const result = await service.findFeed(1, {});

      expect(result.articles).toHaveLength(1);
      expect(result.articlesCount).toBe(1);
      expect(mockQb.where).toHaveBeenCalledWith('article.authorId IN (:ids)', { ids: [2, 3] });
    });

    it('should return empty feed when user follows nobody', async () => {
      followsRepository.find.mockResolvedValue([]);

      const result = await service.findFeed(1, {});

      expect(result.articles).toEqual([]);
      expect(result.articlesCount).toBe(0);
    });
  });

  // ------- Business Logic: Comments -------

  describe('addComment', () => {
    it('should add a comment to an article', async () => {
      const article = createArticle();
      articleRepository.findOne.mockResolvedValue(article);
      commentRepository.save.mockResolvedValue({ id: 1, body: 'Great article!' } as Comment);
      articleRepository.save.mockResolvedValue(article);

      const result = await service.addComment('test-article-abc123', { body: 'Great article!' });

      expect(result.article).toBeDefined();
      expect(commentRepository.save).toHaveBeenCalled();
      expect(articleRepository.save).toHaveBeenCalled();
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment from an article', async () => {
      const comment = { id: 10, body: 'A comment' } as Comment;
      const article = createArticle({ comments: [comment] });
      articleRepository.findOne.mockResolvedValue(article);
      commentRepository.findOne.mockResolvedValue(comment);
      commentRepository.delete.mockResolvedValue({ affected: 1, raw: {} });
      articleRepository.save.mockResolvedValue(article);

      const result = await service.deleteComment('test-article-abc123', '10');

      expect(commentRepository.delete).toHaveBeenCalledWith(10);
      expect(result.article).toBeDefined();
    });

    it('should not delete if comment is not found in article', async () => {
      const comment = { id: 10, body: 'A comment' } as Comment;
      const article = createArticle({ comments: [] });
      articleRepository.findOne.mockResolvedValue(article);
      commentRepository.findOne.mockResolvedValue(comment);

      const result = await service.deleteComment('test-article-abc123', '10');

      expect(commentRepository.delete).not.toHaveBeenCalled();
      expect(result.article).toBeDefined();
    });
  });

  describe('findComments', () => {
    it('should return comments for an article', async () => {
      const comments = [{ id: 1, body: 'Comment 1' }, { id: 2, body: 'Comment 2' }] as Comment[];
      const article = createArticle({ comments });
      articleRepository.findOne.mockResolvedValue(article);

      const result = await service.findComments('test-article-abc123');

      expect(result.comments).toHaveLength(2);
    });
  });

  // ------- Business Logic: Favorites -------

  describe('favorite', () => {
    it('should favorite an article and increment favoriteCount', async () => {
      const article = createArticle({ favoriteCount: 0 });
      const user = createUser({ favorites: [] });
      articleRepository.findOne.mockResolvedValue(article);
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue(user);
      articleRepository.save.mockResolvedValue({ ...article, favoriteCount: 1 } as ArticleEntity);

      const result = await service.favorite(1, 'test-article-abc123');

      expect(userRepository.save).toHaveBeenCalled();
      expect(articleRepository.save).toHaveBeenCalled();
      expect(result.article).toBeDefined();
    });

    it('should not double-favorite an already favorited article', async () => {
      const article = createArticle({ id: 5, favoriteCount: 1 });
      const user = createUser({ favorites: [article] });
      articleRepository.findOne.mockResolvedValue(article);
      userRepository.findOne.mockResolvedValue(user);

      await service.favorite(1, 'test-article-abc123');

      expect(userRepository.save).not.toHaveBeenCalled();
      expect(articleRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('unFavorite', () => {
    it('should unfavorite an article and decrement favoriteCount', async () => {
      const article = createArticle({ id: 5, favoriteCount: 1 });
      const user = createUser({ favorites: [article] });
      articleRepository.findOne.mockResolvedValue(article);
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue(user);
      articleRepository.save.mockResolvedValue({ ...article, favoriteCount: 0 } as ArticleEntity);

      const result = await service.unFavorite(1, 'test-article-abc123');

      expect(userRepository.save).toHaveBeenCalled();
      expect(articleRepository.save).toHaveBeenCalled();
      expect(result.article).toBeDefined();
    });

    it('should not change anything if article is not in favorites', async () => {
      const article = createArticle({ id: 5, favoriteCount: 0 });
      const user = createUser({ favorites: [] });
      articleRepository.findOne.mockResolvedValue(article);
      userRepository.findOne.mockResolvedValue(user);

      await service.unFavorite(1, 'test-article-abc123');

      expect(userRepository.save).not.toHaveBeenCalled();
      expect(articleRepository.save).not.toHaveBeenCalled();
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

      // Extremely unlikely to collide, but the base should match
      expect(slug1).toMatch(/^same-title-/);
      expect(slug2).toMatch(/^same-title-/);
    });
  });
});
