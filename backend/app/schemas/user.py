from typing import Literal

from pydantic import BaseModel, EmailStr

UserRole = Literal["candidate", "recruiter"]


class UserRead(BaseModel):
    id: str
    email: EmailStr
    role: UserRole
    is_active: bool

    model_config = {"from_attributes": True}
