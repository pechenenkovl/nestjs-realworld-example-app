import { UserData } from '../user/user.interface';
import { ArticleDocument } from './article.schema';

interface Comment {
  body: string;
}

interface ArticleData {
  slug: string;
  title: string;
  description: string;
  body?: string;
  tagList?: string[];
  createdAt?: Date
  updatedAt?: Date
  favorited?: boolean;
  favoritesCount?: number;
  author?: UserData;
}

export interface CommentsRO {
  comments: Comment[];
}

export interface ArticleRO {
  article: ArticleDocument;
}

export interface ArticlesRO {
  articles: ArticleDocument[];
  articlesCount: number;
}

