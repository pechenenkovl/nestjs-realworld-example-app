import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import { CreateUserDto, LoginUserDto, UpdateUserDto } from './dto';
const jwt = require('jsonwebtoken');
import { SECRET } from '../config';
import { UserRO } from './user.interface';
import { validate } from 'class-validator';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { HttpStatus } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>
  ) {}

  async findAll(): Promise<UserDocument[]> {
    return await this.userModel.find().exec();
  }

  async findOne({ email, password }: LoginUserDto): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      return null;
    }

    if (await argon2.verify(user.password, password)) {
      return user;
    }

    return null;
  }

  async create(dto: CreateUserDto): Promise<UserRO> {

    // check uniqueness of username/email
    const { username, email, password } = dto;
    const user = await this.userModel.findOne({
      $or: [{ username }, { email }]
    }).exec();

    if (user) {
      const errors = { username: 'Username and email must be unique.' };
      throw new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.BAD_REQUEST);
    }

    // create new user
    const newUser = new this.userModel();
    newUser.username = username;
    newUser.email = email;
    newUser.password = password;
    newUser.articles = [];

    const errors = await validate(newUser);
    if (errors.length > 0) {
      const _errors = { username: 'Userinput is not valid.' };
      throw new HttpException({ message: 'Input data validation failed', _errors }, HttpStatus.BAD_REQUEST);
    } else {
      const savedUser = await newUser.save();
      return this.buildUserRO(savedUser);
    }
  }

  async update(id: number, dto: UpdateUserDto): Promise<UserDocument> {
    const toUpdate = await this.userModel.findById(id).exec();
    const updated = Object.assign(toUpdate, dto);
    return await updated.save();
  }

  async delete(email: string): Promise<any> {
    return await this.userModel.deleteOne({ email }).exec();
  }

  async findById(id: number): Promise<UserRO> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      const errors = { User: ' not found' };
      throw new HttpException({ errors }, 401);
    }

    return this.buildUserRO(user);
  }

  async findByEmail(email: string): Promise<UserRO> {
    const user = await this.userModel.findOne({ email }).exec();
    return this.buildUserRO(user);
  }

  public generateJWT(user) {
    let today = new Date();
    let exp = new Date(today);
    exp.setDate(today.getDate() + 60);

    return jwt.sign({
      id: user.id,
      username: user.username,
      email: user.email,
      exp: exp.getTime() / 1000,
    }, SECRET);
  };

  private buildUserRO(user: UserDocument) {
    const userRO = {
      id: user._id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      token: this.generateJWT(user),
      image: user.image
    };

    return { user: userRO };
  }
}
