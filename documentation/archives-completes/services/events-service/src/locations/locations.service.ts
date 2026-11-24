import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Location } from '../entity/location.entity'
import { CreateLocationDto } from './dto/create-location.dto'
import { UpdateLocationDto } from './dto/update-location.dto'

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  create(dto: CreateLocationDto) {
    const location = this.locationRepository.create(dto)
    return this.locationRepository.save(location)
  }

  findAll() {
    return this.locationRepository.find()
  }

  async findOne(id: string) {
    const location = await this.locationRepository.findOne({ where: { id } })
    if (!location) {
      throw new NotFoundException('Location not found')
    }
    return location
  }

  async update(id: string, dto: UpdateLocationDto) {
    const location = await this.findOne(id)
    Object.assign(location, dto)
    return this.locationRepository.save(location)
  }

  async remove(id: string) {
    const location = await this.findOne(id)
    await this.locationRepository.remove(location)
  }
}
