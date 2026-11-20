import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Location } from './location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationsRepository: Repository<Location>,
  ) {}

  findAll(): Promise<Location[]> {
    return this.locationsRepository.find({ order: { name: 'ASC' } });
  }

  async create(input: CreateLocationDto): Promise<Location> {
    try {
      return await this.locationsRepository.save(
        this.locationsRepository.create(input),
      );
    } catch (error) {
      this.throwIfUniqueNameConflict(error);
      throw error;
    }
  }

  async update(id: string, input: UpdateLocationDto): Promise<Location> {
    const location = await this.findOne(id);
    if (input.name === undefined) {
      return location;
    }

    location.name = input.name;
    try {
      return await this.locationsRepository.save(location);
    } catch (error) {
      this.throwIfUniqueNameConflict(error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    try {
      await this.locationsRepository.delete(id);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        error.driverError?.code === '23503'
      ) {
        throw new ConflictException(
          'This location cannot be deleted because it is used by an event.',
        );
      }
      throw error;
    }
  }

  async findOne(id: string): Promise<Location> {
    const location = await this.locationsRepository.findOneBy({ id });
    if (!location) {
      throw new NotFoundException(`Location ${id} not found`);
    }
    return location;
  }

  private throwIfUniqueNameConflict(error: unknown): void {
    if (
      error instanceof QueryFailedError &&
      error.driverError?.code === '409'
    ) {
      throw new ConflictException('A location with this name already exists.');
    }
  }
}
