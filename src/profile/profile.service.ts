import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/user.schema';
import { Follow, FollowDocument } from './follow.schema';
import { ProfileRO, ProfileData } from './profile.interface';
import { HttpException } from '@nestjs/common/exceptions/http.exception';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Follow.name)
    private readonly followModel: Model<FollowDocument>
  ) {}

  async findAll(): Promise<UserDocument[]> {
    return await this.userModel.find().exec();
  }

  async findOne(options?: any): Promise<ProfileRO> {
    const user = await this.userModel.findOne(options).exec();
    const profile = user.toObject();
    delete profile._id;
    delete profile.password;
    return { profile };
  }

  async findProfile(id: number, followingUsername: string): Promise<ProfileRO> {
    const _profile = await this.userModel.findOne({ username: followingUsername }).exec();

    if (!_profile) return;

    let profile: ProfileData = {
      username: _profile.username,
      bio: _profile.bio,
      image: _profile.image
    };

    const follows = await this.followModel.findOne({ followerId: id, followingId: _profile._id } as any).exec();

    if (id) {
      profile.following = !!follows;
    }

    return { profile };
  }

  async follow(followerEmail: string, username: string): Promise<ProfileRO> {
    if (!followerEmail || !username) {
      throw new HttpException('Follower email and username not provided.', HttpStatus.BAD_REQUEST);
    }

    const followingUser = await this.userModel.findOne({ username }).exec();
    const followerUser = await this.userModel.findOne({ email: followerEmail }).exec();

    if (followingUser.email === followerEmail) {
      throw new HttpException('FollowerEmail and FollowingId cannot be equal.', HttpStatus.BAD_REQUEST);
    }

    const _follows = await this.followModel.findOne({ followerId: followerUser._id, followingId: followingUser._id }).exec();

    if (!_follows) {
      const follows = new this.followModel();
      follows.followerId = followerUser._id;
      follows.followingId = followingUser._id;
      await follows.save();
    }

    let profile: ProfileData = {
      username: followingUser.username,
      bio: followingUser.bio,
      image: followingUser.image,
      following: true
    };

    return { profile };
  }

  async unFollow(followerId: number, username: string): Promise<ProfileRO> {
    if (!followerId || !username) {
      throw new HttpException('FollowerId and username not provided.', HttpStatus.BAD_REQUEST);
    }

    const followingUser = await this.userModel.findOne({ username }).exec();

    if (followingUser._id.toString() === String(followerId)) {
      throw new HttpException('FollowerId and FollowingId cannot be equal.', HttpStatus.BAD_REQUEST);
    }

    await this.followModel.deleteOne({ followerId, followingId: followingUser._id } as any).exec();

    let profile: ProfileData = {
      username: followingUser.username,
      bio: followingUser.bio,
      image: followingUser.image,
      following: false
    };

    return { profile };
  }

}
