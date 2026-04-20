import { Test, TestingModule } from '@nestjs/testing';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { ArticleEntity } from './article.entity';
import { DeleteResult } from 'typeorm';

const mockArticleService = () => ({
  findAll: jest.fn(),
  findFeed: jest.fn(),
  findOne: jest.fn(),
  findComments: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  addComment: jest.fn(),
  deleteComment: jest.fn(),
  favorite: jest.fn(),
  unFavorite: jest.fn(),
});

describe('ArticleController', () => {
  let controller: ArticleController;
  let articleService: jest.Mocked<ArticleService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticleController],
      providers: [{ provide: ArticleService, useFactory: mockArticleService }],
    }).compile();

    controller = module.get<ArticleController>(ArticleController);
    articleService = module.get(ArticleService);
  });

  afterEach(() => jest.clearAllMocks());

  const createArticle = (overrides = {}): ArticleEntity => {
    const article = new ArticleEntity();
    article.id = 1;
    article.slug = 'test-article-abc';
    article.title = 'Test Article';
    article.description = 'A description';
    article.body = 'Body text';
    article.tagList = ['nestjs'];
    article.comments = [];
    article.favoriteCount = 0;
    article.created = new Date('2025-01-01');
    article.updated = new Date('2025-01-01');
    Object.assign(article, overrides);
    return article;
  };

  // ------- GET /articles -------

  describe('findAll', () => {
    it('should return all articles with count', async () => {
      const articles = [createArticle()];
      articleService.findAll.mockResolvedValue({ articles, articlesCount: 1 });

      const result = await controller.findAll({ tag: 'nestjs' });

      expect(result.articles).toHaveLength(1);
      expect(result.articlesCount).toBe(1);
      expect(articleService.findAll).toHaveBeenCalledWith({ tag: 'nestjs' });
    });
  });

  // ------- GET /articles/feed -------

  describe('getFeed', () => {
    it('should return article feed for authenticated user', async () => {
      const articles = [createArticle()];
      articleService.findFeed.mockResolvedValue({ articles, articlesCount: 1 });

      const result = await controller.getFeed(1, { limit: 10 });

      expect(result.articles).toHaveLength(1);
      expect(articleService.findFeed).toHaveBeenCalledWith(1, { limit: 10 });
    });
  });

  // ------- GET /articles/:slug -------

  describe('findOne', () => {
    it('should return a single article by slug', async () => {
      const article = createArticle();
      articleService.findOne.mockResolvedValue({ article });

      const result = await controller.findOne('test-article-abc');

      expect(result.article).toEqual(article);
      expect(articleService.findOne).toHaveBeenCalledWith({ slug: 'test-article-abc' });
    });
  });

  // ------- POST /articles -------

  describe('create', () => {
    it('should create and return a new article', async () => {
      const article = createArticle();
      articleService.create.mockResolvedValue(article);

      const dto = { title: 'Test Article', description: 'A description', body: 'Body text', tagList: ['nestjs'] };
      const result = await controller.create(1, dto);

      expect(result).toEqual(article);
      expect(articleService.create).toHaveBeenCalledWith(1, dto);
    });
  });

  // ------- PUT /articles/:slug -------

  describe('update', () => {
    it('should update and return the article', async () => {
      const article = createArticle({ title: 'Updated' });
      articleService.update.mockResolvedValue({ article });

      const dto = { title: 'Updated', description: 'desc', body: 'body', tagList: [] };
      const result = await controller.update({ slug: 'test-article-abc' }, dto);

      expect(result.article.title).toBe('Updated');
      expect(articleService.update).toHaveBeenCalledWith('test-article-abc', dto);
    });
  });

  // ------- DELETE /articles/:slug -------

  describe('delete', () => {
    it('should delete article by slug', async () => {
      const deleteResult: DeleteResult = { affected: 1, raw: {} };
      articleService.delete.mockResolvedValue(deleteResult);

      const result = await controller.delete({ slug: 'test-article-abc' });

      expect(result).toEqual(deleteResult);
      expect(articleService.delete).toHaveBeenCalledWith('test-article-abc');
    });
  });

  // ------- GET /articles/:slug/comments -------

  describe('findComments', () => {
    it('should return comments for an article', async () => {
      const comments = [{ id: 1, body: 'Nice!' }];
      articleService.findComments.mockResolvedValue({ comments });

      const result = await controller.findComments('test-article-abc');

      expect(result.comments).toHaveLength(1);
      expect(articleService.findComments).toHaveBeenCalledWith('test-article-abc');
    });
  });

  // ------- POST /articles/:slug/comments -------

  describe('createComment', () => {
    it('should add a comment to the article', async () => {
      const article = createArticle();
      articleService.addComment.mockResolvedValue({ article });

      const result = await controller.createComment('test-article-abc', { body: 'Great!' });

      expect(result.article).toBeDefined();
      expect(articleService.addComment).toHaveBeenCalledWith('test-article-abc', { body: 'Great!' });
    });
  });

  // ------- DELETE /articles/:slug/comments/:id -------

  describe('deleteComment', () => {
    it('should delete a comment from an article', async () => {
      const article = createArticle();
      articleService.deleteComment.mockResolvedValue({ article });

      const result = await controller.deleteComment({ slug: 'test-article-abc', id: '5' });

      expect(result.article).toBeDefined();
      expect(articleService.deleteComment).toHaveBeenCalledWith('test-article-abc', '5');
    });
  });

  // ------- POST /articles/:slug/favorite -------

  describe('favorite', () => {
    it('should favorite an article', async () => {
      const article = createArticle({ favoriteCount: 1 });
      articleService.favorite.mockResolvedValue({ article });

      const result = await controller.favorite(1, 'test-article-abc');

      expect(result.article.favoriteCount).toBe(1);
      expect(articleService.favorite).toHaveBeenCalledWith(1, 'test-article-abc');
    });
  });

  // ------- DELETE /articles/:slug/favorite -------

  describe('unFavorite', () => {
    it('should unfavorite an article', async () => {
      const article = createArticle({ favoriteCount: 0 });
      articleService.unFavorite.mockResolvedValue({ article });

      const result = await controller.unFavorite(1, 'test-article-abc');

      expect(result.article.favoriteCount).toBe(0);
      expect(articleService.unFavorite).toHaveBeenCalledWith(1, 'test-article-abc');
    });
  });
});
