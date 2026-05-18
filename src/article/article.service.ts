import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Article, ArticleDocument } from './article.schema';
import { User, UserDocument } from '../user/user.schema';
import { Follow, FollowDocument } from '../profile/follow.schema';
import { CreateArticleDto } from './dto';

import { ArticleRO, ArticlesRO, CommentsRO } from './article.interface';
const slug = require('slug');

@Injectable()
export class ArticleService {
  constructor(
    @InjectModel(Article.name)
    private readonly articleModel: Model<ArticleDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Follow.name)
    private readonly followModel: Model<FollowDocument>
  ) {}

  async findAll(query): Promise<ArticlesRO> {
    const filter: any = {};

    if ('tag' in query) {
      filter.tagList = { $in: [query.tag] };
    }

    if ('author' in query) {
      const author = await this.userModel.findOne({ username: query.author }).exec();
      if (author) {
        filter.author = author._id;
      }
    }

    if ('favorited' in query) {
      const user = await this.userModel.findOne({ username: query.favorited }).exec();
      if (user && user.favorites && user.favorites.length > 0) {
        filter._id = { $in: user.favorites };
      }
    }

    const articlesCount = await this.articleModel.countDocuments(filter).exec();

    let queryBuilder = this.articleModel.find(filter)
      .populate('author')
      .sort({ createdAt: -1 });

    if ('limit' in query) {
      queryBuilder = queryBuilder.limit(Number(query.limit));
    }

    if ('offset' in query) {
      queryBuilder = queryBuilder.skip(Number(query.offset));
    }

    const articles = await queryBuilder.exec();

    return { articles, articlesCount };
  }

  async findFeed(userId: any, query): Promise<ArticlesRO> {
    const _follows = await this.followModel.find({ followerId: userId } as any).exec();

    if (!(Array.isArray(_follows) && _follows.length > 0)) {
      return { articles: [], articlesCount: 0 };
    }

    const ids = _follows.map(el => el.followingId);

    const filter = { author: { $in: ids } };

    const articlesCount = await this.articleModel.countDocuments(filter).exec();

    let queryBuilder = this.articleModel.find(filter)
      .sort({ createdAt: -1 });

    if ('limit' in query) {
      queryBuilder = queryBuilder.limit(Number(query.limit));
    }

    if ('offset' in query) {
      queryBuilder = queryBuilder.skip(Number(query.offset));
    }

    const articles = await queryBuilder.exec();

    return { articles, articlesCount };
  }

  async findOne(where): Promise<ArticleRO> {
    const article = await this.articleModel.findOne(where).populate('author').exec();
    return { article };
  }

  async addComment(slug: string, commentData): Promise<ArticleRO> {
    const article = await this.articleModel.findOneAndUpdate(
      { slug },
      { $push: { comments: { body: commentData.body } } },
      { new: true }
    ).populate('author').exec();

    return { article };
  }

  async deleteComment(slug: string, id: string): Promise<ArticleRO> {
    const article = await this.articleModel.findOneAndUpdate(
      { slug },
      { $pull: { comments: { _id: id } } },
      { new: true }
    ).populate('author').exec();

    return { article };
  }

  async favorite(id: any, slug: string): Promise<ArticleRO> {
    const article = await this.articleModel.findOne({ slug }).exec();
    const user = await this.userModel.findById(id).exec();

    const isNewFavorite = !user.favorites.some(fav => fav.toString() === article._id.toString());
    if (isNewFavorite) {
      user.favorites.push(article._id);
      article.favoriteCount++;

      await user.save();
      await article.save();
    }

    return { article };
  }

  async unFavorite(id: any, slug: string): Promise<ArticleRO> {
    const article = await this.articleModel.findOne({ slug }).exec();
    const user = await this.userModel.findById(id).exec();

    const deleteIndex = user.favorites.findIndex(fav => fav.toString() === article._id.toString());

    if (deleteIndex >= 0) {
      user.favorites.splice(deleteIndex, 1);
      article.favoriteCount--;

      await user.save();
      await article.save();
    }

    return { article };
  }

  async findComments(slug: string): Promise<CommentsRO> {
    const article = await this.articleModel.findOne({ slug }).exec();
    return { comments: article.comments };
  }

  async create(userId: any, articleData: CreateArticleDto): Promise<ArticleDocument> {
    const newArticle = new this.articleModel();
    newArticle.title = articleData.title;
    newArticle.description = articleData.description;
    newArticle.slug = this.slugify(articleData.title);
    newArticle.tagList = articleData.tagList || [];
    newArticle.comments = [];
    newArticle.author = userId as any;

    const savedArticle = await newArticle.save();

    await this.userModel.findByIdAndUpdate(userId, { $push: { articles: savedArticle._id } }).exec();

    return savedArticle;
  }

  async update(slug: string, articleData: any): Promise<ArticleRO> {
    const article = await this.articleModel.findOneAndUpdate(
      { slug },
      { $set: articleData },
      { new: true }
    ).populate('author').exec();

    return { article };
  }

  async delete(slug: string): Promise<any> {
    return await this.articleModel.deleteOne({ slug }).exec();
  }

  slugify(title: string) {
    return slug(title, { lower: true }) + '-' + (Math.random() * Math.pow(36, 6) | 0).toString(36);
  }
}
