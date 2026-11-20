import { User } from '../user.entity';

export function toUserResponse(u: User) {
    return {
        id: u.id,
        email: u.email,
        pseudo: u.pseudo,
        firstName: u.firstName ?? null,
        lastName: u.lastName ?? null,
        phone: u.phone ?? null,
        birthDate: u.birthDate ?? null,
        role: u.role,
    };
}