from pydantic import BaseModel
class UserInput(BaseModel):
    name: str
    company: str
    year: int
    kms_driven: int
