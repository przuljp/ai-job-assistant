from fastapi import FastAPI

from app.routers import job_application, user

app = FastAPI()

app.include_router(user.router)
app.include_router(job_application.router)


@app.get("/")
def read_root():
    return {"status": "ok"}
