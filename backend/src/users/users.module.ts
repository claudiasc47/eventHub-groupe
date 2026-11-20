import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { Module } from "@nestjs/common/decorators/modules/module.decorator";

@Module({
  imports: [TypeOrmModule.forFeature([User])],
})
export class UsersModule {}