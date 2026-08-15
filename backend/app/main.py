from fastapi import FastAPI

from app.routers import ai_analysis, dashboard, job_application, resume, user

app = FastAPI()

app.include_router(user.router)
app.include_router(job_application.router)
app.include_router(ai_analysis.router)
app.include_router(resume.router)
app.include_router(dashboard.router)


@app.get("/")
def read_root():
    return {"status": "ok"}
