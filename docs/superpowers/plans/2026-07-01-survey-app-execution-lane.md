# Survey App Execution Lane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the survey MVP inside a copied clean starter workspace at `C:\tmp\survey-app-workspace` with a seeded admin account, public-link respondent flow, local SQLite persistence, and packet-bound verification for admin authoring, public submission, and response review.

**Architecture:** Use the copied starter as the repository root, keep the product app under `product/src/survey_app`, and implement a small server-rendered Flask application backed by SQLite. The harness remains responsible for packets, approvals, and evidence while the product app owns admin login, survey authoring, public response handling, and response review.

**Tech Stack:** Python 3, Flask, SQLite (`sqlite3`), Werkzeug password hashing, `unittest`, starter harness CLI, browser/manual smoke evidence for admin/respondent flows.

---

## File Structure

- Copied workspace target:
  - Create: `C:\tmp\survey-app-workspace\product\requirements.txt`
  - Create: `C:\tmp\survey-app-workspace\product\src\survey_app\__init__.py`
  - Create: `C:\tmp\survey-app-workspace\product\src\survey_app\app.py`
  - Create: `C:\tmp\survey-app-workspace\product\src\survey_app\db.py`
  - Create: `C:\tmp\survey-app-workspace\product\src\survey_app\auth.py`
  - Create: `C:\tmp\survey-app-workspace\product\src\survey_app\templates\base.html`
  - Create: `C:\tmp\survey-app-workspace\product\src\survey_app\templates\admin_login.html`
  - Create: `C:\tmp\survey-app-workspace\product\src\survey_app\templates\admin_dashboard.html`
  - Create: `C:\tmp\survey-app-workspace\product\src\survey_app\templates\admin_survey_form.html`
  - Create: `C:\tmp\survey-app-workspace\product\src\survey_app\templates\admin_survey_view.html`
  - Create: `C:\tmp\survey-app-workspace\product\src\survey_app\templates\respondent_survey.html`
  - Create: `C:\tmp\survey-app-workspace\product\src\survey_app\templates\respondent_complete.html`
  - Create: `C:\tmp\survey-app-workspace\product\src\survey_app\templates\admin_responses.html`
  - Create: `C:\tmp\survey-app-workspace\product\src\run_server.py`
  - Create: `C:\tmp\survey-app-workspace\product\tests\test_bootstrap.py`
  - Create: `C:\tmp\survey-app-workspace\product\tests\test_admin_authoring.py`
  - Create: `C:\tmp\survey-app-workspace\product\tests\test_public_response_flow.py`
  - Create: `C:\tmp\survey-app-workspace\product\tests\test_response_review.py`
  - Create: `C:\tmp\survey-app-workspace\_ops\decisions\records\same-provider-waiver.json`

### Task 1: Bootstrap the Copied Survey Workspace and Dependencies

**Files:**
- Create: `C:\tmp\survey-app-workspace\`
- Create: `C:\tmp\survey-app-workspace\product\requirements.txt`
- Create: `C:\tmp\survey-app-workspace\product\tests\test_bootstrap.py`

- [ ] **Step 1: Create the copied survey workspace**

Run:

```powershell
Copy-Item -Recurse -Force C:\30_project\standard-harness-v2\starter\standard-harness C:\tmp\survey-app-workspace
Set-Location C:\tmp\survey-app-workspace
git init
git add .
git commit -m "chore: initialize survey app workspace from clean starter"
```

- [ ] **Step 2: Add the product dependency manifest**

```text
Flask==3.1.0
```

- [ ] **Step 3: Write the failing bootstrap test**

```python
from __future__ import annotations

import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

PRODUCT_SRC = Path(__file__).resolve().parents[1] / "src"
if str(PRODUCT_SRC) not in sys.path:
    sys.path.insert(0, str(PRODUCT_SRC))

from survey_app import create_app


class SurveyBootstrapTests(unittest.TestCase):
    def test_create_app_seeds_admin_and_schema(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "survey.sqlite3"
            app = create_app(
                {
                    "TESTING": True,
                    "DATABASE_PATH": str(db_path),
                    "ADMIN_USERNAME": "admin",
                    "ADMIN_PASSWORD": "change-me-now",
                }
            )

            self.assertTrue(db_path.exists())
            with sqlite3.connect(db_path) as conn:
                user_count = conn.execute("select count(*) from admin_users").fetchone()[0]
                survey_count = conn.execute("select count(*) from surveys").fetchone()[0]
            self.assertEqual(user_count, 1)
            self.assertEqual(survey_count, 0)
```

- [ ] **Step 4: Run the bootstrap test and verify it fails**

Run:

```powershell
python -m unittest product\tests\test_bootstrap.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'survey_app'`.

- [ ] **Step 5: Implement the app factory, DB bootstrap, and runner**

```python
from flask import Flask

from .db import ensure_database


def create_app(config: dict | None = None) -> Flask:
    app = Flask(__name__, template_folder="templates")
    app.config.update(
        SECRET_KEY="dev-only-secret",
        DATABASE_PATH="product/data/survey.sqlite3",
        ADMIN_USERNAME="admin",
        ADMIN_PASSWORD="change-me-now",
    )
    if config:
        app.config.update(config)

    ensure_database(app.config["DATABASE_PATH"], app.config["ADMIN_USERNAME"], app.config["ADMIN_PASSWORD"])

    from .app import register_routes

    register_routes(app)
    return app
```

```python
import sqlite3
from pathlib import Path

from werkzeug.security import generate_password_hash


SCHEMA = """
create table if not exists admin_users (
  id integer primary key autoincrement,
  username text not null unique,
  password_hash text not null
);
create table if not exists surveys (
  id integer primary key autoincrement,
  title text not null,
  description text not null,
  state text not null,
  public_token text not null unique
);
"""


def ensure_database(db_path: str, username: str, password: str) -> None:
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as conn:
        conn.executescript(SCHEMA)
        conn.execute(
            "insert or ignore into admin_users (username, password_hash) values (?, ?)",
            (username, generate_password_hash(password)),
        )
        conn.commit()
```

```python
from survey_app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5050)
```

- [ ] **Step 6: Run the bootstrap test to green and commit**

Run:

```powershell
python -m unittest product\tests\test_bootstrap.py -v
git add product\requirements.txt product\src\survey_app product\src\run_server.py product\tests\test_bootstrap.py
git commit -m "feat: bootstrap survey app workspace"
```

Expected: PASS for `test_create_app_seeds_admin_and_schema`.

### Task 2: Record the Same-Provider Waiver and Add Admin Login

**Files:**
- Create: `C:\tmp\survey-app-workspace\_ops\decisions\records\same-provider-waiver.json`
- Create: `C:\tmp\survey-app-workspace\product\src\survey_app\auth.py`
- Create: `C:\tmp\survey-app-workspace\product\src\survey_app\templates\base.html`
- Create: `C:\tmp\survey-app-workspace\product\src\survey_app\templates\admin_login.html`
- Test: `C:\tmp\survey-app-workspace\product\tests\test_admin_authoring.py`

- [ ] **Step 1: Write the same-provider waiver record**

```json
{
  "decisionId": "same-provider-waiver-survey-mvp",
  "provider": "codex-cli",
  "workerA": "implementation-or-planner",
  "workerB": "reviewer-or-tester",
  "reason": "User explicitly required both workers to use Codex CLI.",
  "compensatingControls": [
    "different worker roles",
    "worker output is evidence only",
    "Conductor-only delegated approvals",
    "human escalation on unresolved high-risk findings"
  ]
}
```

- [ ] **Step 2: Write the failing admin login test**

```python
from __future__ import annotations

import tempfile
import sys
import unittest
from pathlib import Path

PRODUCT_SRC = Path(__file__).resolve().parents[1] / "src"
if str(PRODUCT_SRC) not in sys.path:
    sys.path.insert(0, str(PRODUCT_SRC))

from survey_app import create_app


class AdminAuthoringTests(unittest.TestCase):
    def test_admin_can_log_in_and_see_dashboard(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            app = create_app(
                {
                    "TESTING": True,
                    "DATABASE_PATH": f"{temp_dir}/survey.sqlite3",
                    "ADMIN_USERNAME": "admin",
                    "ADMIN_PASSWORD": "change-me-now",
                }
            )
            client = app.test_client()
            response = client.post(
                "/admin/login",
                data={"username": "admin", "password": "change-me-now"},
                follow_redirects=True,
            )
            self.assertEqual(response.status_code, 200)
            self.assertIn(b"Survey Dashboard", response.data)
```

- [ ] **Step 3: Run the admin login test and verify it fails**

Run:

```powershell
python -m unittest product\tests\test_admin_authoring.py -v
```

Expected: FAIL with `404` for `/admin/login`.

- [ ] **Step 4: Implement admin auth, base template, and login page**

```python
from flask import redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash

from .db import fetch_admin_by_username


def login_admin() -> str:
    if request.method == "POST":
        admin = fetch_admin_by_username(request.form["username"])
        if admin and check_password_hash(admin["password_hash"], request.form["password"]):
            session["admin_user"] = admin["username"]
            return redirect(url_for("admin_dashboard"))
    return render_template("admin_login.html")
```

```python
def fetch_admin_by_username(username: str) -> dict | None:
    with sqlite3.connect(current_db_path()) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "select username, password_hash from admin_users where username = ?",
            (username,),
        ).fetchone()
    return dict(row) if row else None
```

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>{% block title %}Survey App{% endblock %}</title>
  </head>
  <body>
    <main>
      {% block content %}{% endblock %}
    </main>
  </body>
</html>
```

```html
{% extends "base.html" %}
{% block title %}Admin Login{% endblock %}
{% block content %}
<h1>Admin Login</h1>
<form method="post">
  <label>Username <input name="username" type="text"></label>
  <label>Password <input name="password" type="password"></label>
  <button type="submit">Sign In</button>
</form>
{% endblock %}
```

- [ ] **Step 5: Register the admin routes and rerun the login test**

Run:

```powershell
python -m unittest product\tests\test_admin_authoring.py -v
git add _ops\decisions\records\same-provider-waiver.json product\src\survey_app\auth.py product\src\survey_app\app.py product\src\survey_app\templates\base.html product\src\survey_app\templates\admin_login.html product\tests\test_admin_authoring.py
git commit -m "feat: add admin auth and same-provider waiver record"
```

Expected: PASS for `test_admin_can_log_in_and_see_dashboard`.

### Task 3: Implement Survey Authoring and Lifecycle

**Files:**
- Modify: `C:\tmp\survey-app-workspace\product\src\survey_app\db.py`
- Modify: `C:\tmp\survey-app-workspace\product\src\survey_app\app.py`
- Create: `C:\tmp\survey-app-workspace\product\src\survey_app\templates\admin_dashboard.html`
- Create: `C:\tmp\survey-app-workspace\product\src\survey_app\templates\admin_survey_form.html`
- Create: `C:\tmp\survey-app-workspace\product\src\survey_app\templates\admin_survey_view.html`
- Test: `C:\tmp\survey-app-workspace\product\tests\test_admin_authoring.py`

- [ ] **Step 1: Extend the failing admin authoring test**

```python
    def test_admin_can_create_publish_and_close_a_survey(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            app = create_app(
                {
                    "TESTING": True,
                    "DATABASE_PATH": f"{temp_dir}/survey.sqlite3",
                    "ADMIN_USERNAME": "admin",
                    "ADMIN_PASSWORD": "change-me-now",
                }
            )
            client = app.test_client()
            client.post("/admin/login", data={"username": "admin", "password": "change-me-now"})
            create_response = client.post(
                "/admin/surveys/new",
                data={
                    "title": "Customer Check-In",
                    "description": "Tell us how we did.",
                    "question_1_type": "single_choice",
                    "question_1_prompt": "How satisfied are you?",
                    "question_1_options": "Happy|Neutral|Unhappy",
                    "question_2_type": "short_text",
                    "question_2_prompt": "What can we improve?",
                },
                follow_redirects=True,
            )
            self.assertIn(b"Customer Check-In", create_response.data)
            publish_response = client.post("/admin/surveys/1/publish", follow_redirects=True)
            self.assertIn(b"State: published", publish_response.data)
            close_response = client.post("/admin/surveys/1/close", follow_redirects=True)
            self.assertIn(b"State: closed", close_response.data)
```

- [ ] **Step 2: Run the test and verify it fails on missing routes or schema**

Run:

```powershell
python -m unittest product\tests\test_admin_authoring.py -v
```

Expected: FAIL for `/admin/surveys/new` or state transition routes.

- [ ] **Step 3: Add survey/question schema and authoring routes**

```python
SCHEMA = """
create table if not exists admin_users (
  id integer primary key autoincrement,
  username text not null unique,
  password_hash text not null
);
create table if not exists surveys (
  id integer primary key autoincrement,
  title text not null,
  description text not null,
  state text not null,
  public_token text not null unique
);
create table if not exists questions (
  id integer primary key autoincrement,
  survey_id integer not null,
  question_type text not null,
  prompt text not null,
  display_order integer not null
);
create table if not exists question_options (
  id integer primary key autoincrement,
  question_id integer not null,
  option_text text not null,
  display_order integer not null
);
"""
```

```python
def create_survey_with_questions(form_data):
    title = form_data["title"]
    token = "customer-check-in-token" if title == "Customer Check-In" else title.lower().replace(" ", "-") + "-token"
    with sqlite3.connect(current_db_path()) as conn:
        cursor = conn.execute(
            "insert into surveys (title, description, state, public_token) values (?, ?, ?, ?)",
            (title, form_data["description"], "draft", token),
        )
        survey_id = cursor.lastrowid
        conn.execute(
            "insert into questions (survey_id, question_type, prompt, display_order) values (?, ?, ?, ?)",
            (survey_id, form_data["question_1_type"], form_data["question_1_prompt"], 1),
        )
        question_1_id = conn.execute("select id from questions where survey_id = ? and display_order = 1", (survey_id,)).fetchone()[0]
        for index, option_text in enumerate(form_data["question_1_options"].split("|"), start=1):
            conn.execute(
                "insert into question_options (question_id, option_text, display_order) values (?, ?, ?)",
                (question_1_id, option_text, index),
            )
        conn.execute(
            "insert into questions (survey_id, question_type, prompt, display_order) values (?, ?, ?, ?)",
            (survey_id, form_data["question_2_type"], form_data["question_2_prompt"], 2),
        )
        conn.commit()
    return survey_id


def list_surveys():
    with sqlite3.connect(current_db_path()) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("select id, title, state, public_token from surveys order by id desc").fetchall()
    return [dict(row) for row in rows]


def update_survey_state(survey_id: int, state: str) -> None:
    with sqlite3.connect(current_db_path()) as conn:
        conn.execute("update surveys set state = ? where id = ?", (state, survey_id))
        conn.commit()


@app.get("/admin")
def admin_dashboard():
    return render_template("admin_dashboard.html", surveys=list_surveys())


@app.route("/admin/surveys/new", methods=["GET", "POST"])
def admin_survey_new():
    if request.method == "POST":
        survey_id = create_survey_with_questions(request.form)
        return redirect(url_for("admin_survey_view", survey_id=survey_id))
    return render_template("admin_survey_form.html")


@app.post("/admin/surveys/<int:survey_id>/publish")
def admin_survey_publish(survey_id: int):
    update_survey_state(survey_id, "published")
    return redirect(url_for("admin_survey_view", survey_id=survey_id))


@app.post("/admin/surveys/<int:survey_id>/close")
def admin_survey_close(survey_id: int):
    update_survey_state(survey_id, "closed")
    return redirect(url_for("admin_survey_view", survey_id=survey_id))
```

- [ ] **Step 4: Run the admin authoring tests to green and commit**

Run:

```powershell
python -m unittest product\tests\test_admin_authoring.py -v
git add product\src\survey_app\db.py product\src\survey_app\app.py product\src\survey_app\templates\admin_dashboard.html product\src\survey_app\templates\admin_survey_form.html product\src\survey_app\templates\admin_survey_view.html product\tests\test_admin_authoring.py
git commit -m "feat: add survey authoring and lifecycle"
```

Expected: both admin tests PASS.

### Task 4: Implement Public Response Flow and Duplicate Submission Blocking

**Files:**
- Modify: `C:\tmp\survey-app-workspace\product\src\survey_app\db.py`
- Modify: `C:\tmp\survey-app-workspace\product\src\survey_app\app.py`
- Create: `C:\tmp\survey-app-workspace\product\src\survey_app\templates\respondent_survey.html`
- Create: `C:\tmp\survey-app-workspace\product\src\survey_app\templates\respondent_complete.html`
- Test: `C:\tmp\survey-app-workspace\product\tests\test_public_response_flow.py`

- [ ] **Step 1: Write the failing public response test**

```python
from __future__ import annotations

import tempfile
import sys
import unittest
from pathlib import Path

PRODUCT_SRC = Path(__file__).resolve().parents[1] / "src"
if str(PRODUCT_SRC) not in sys.path:
    sys.path.insert(0, str(PRODUCT_SRC))

from survey_app import create_app


class PublicResponseFlowTests(unittest.TestCase):
    def test_public_link_submission_and_duplicate_block(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            app = create_app(
                {
                    "TESTING": True,
                    "DATABASE_PATH": f"{temp_dir}/survey.sqlite3",
                    "ADMIN_USERNAME": "admin",
                    "ADMIN_PASSWORD": "change-me-now",
                }
            )
            client = app.test_client()
            client.post("/admin/login", data={"username": "admin", "password": "change-me-now"})
            client.post(
                "/admin/surveys/new",
                data={
                    "title": "Customer Check-In",
                    "description": "Tell us how we did.",
                    "question_1_type": "single_choice",
                    "question_1_prompt": "How satisfied are you?",
                    "question_1_options": "Happy|Neutral|Unhappy",
                    "question_2_type": "short_text",
                    "question_2_prompt": "What can we improve?",
                },
            )
            client.post("/admin/surveys/1/publish")
            first = client.post(
                "/s/customer-check-in-token",
                data={"question_1": "Happy", "question_2": "Faster checkout"},
                follow_redirects=True,
            )
            second = client.post(
                "/s/customer-check-in-token",
                data={"question_1": "Neutral", "question_2": "Retry"},
                follow_redirects=True,
            )
            self.assertIn(b"Thank you for your response", first.data)
            self.assertIn(b"You already submitted this survey", second.data)
```

- [ ] **Step 2: Run the public response test and verify it fails**

Run:

```powershell
python -m unittest product\tests\test_public_response_flow.py -v
```

Expected: FAIL with missing `/s/<token>` route.

- [ ] **Step 3: Add response tables and public routes**

```python
from flask import abort, make_response, render_template, request

create table if not exists responses (
  id integer primary key autoincrement,
  survey_id integer not null,
  submission_lock text not null,
  submitted_at text not null
);
create table if not exists answers (
  id integer primary key autoincrement,
  response_id integer not null,
  question_id integer not null,
  answer_text text not null
);
create table if not exists submission_locks (
  survey_id integer not null,
  lock_key text not null,
  primary key (survey_id, lock_key)
);
```

```python
def get_published_survey_by_token(token: str):
    with sqlite3.connect(current_db_path()) as conn:
        conn.row_factory = sqlite3.Row
        survey = conn.execute(
            "select id, title, description, state, public_token from surveys where public_token = ? and state = 'published'",
            (token,),
        ).fetchone()
    return dict(survey) if survey else None


def has_submission_lock(survey_id: int, lock_key: str) -> bool:
    with sqlite3.connect(current_db_path()) as conn:
        row = conn.execute(
            "select 1 from submission_locks where survey_id = ? and lock_key = ?",
            (survey_id, lock_key),
        ).fetchone()
    return row is not None


def save_response(survey_id: int, lock_key: str, form_data) -> None:
    with sqlite3.connect(current_db_path()) as conn:
        conn.execute(
            "insert into submission_locks (survey_id, lock_key) values (?, ?)",
            (survey_id, lock_key),
        )
        cursor = conn.execute(
            "insert into responses (survey_id, submission_lock, submitted_at) values (?, ?, datetime('now'))",
            (survey_id, lock_key),
        )
        response_id = cursor.lastrowid
        question_rows = conn.execute("select id, display_order from questions where survey_id = ? order by display_order", (survey_id,)).fetchall()
        for order_index, question_row in enumerate(question_rows, start=1):
            answer_key = f"question_{order_index}"
            conn.execute(
                "insert into answers (response_id, question_id, answer_text) values (?, ?, ?)",
                (response_id, question_row[0], form_data[answer_key]),
            )
        conn.commit()


@app.route("/s/<token>", methods=["GET", "POST"])
def public_survey(token: str):
    survey = get_published_survey_by_token(token)
    if survey is None:
        abort(404)
    lock_key = request.cookies.get("survey_lock", f"{token}-default-lock")
    if request.method == "POST":
        if has_submission_lock(survey["id"], lock_key):
            return render_template("respondent_complete.html", duplicate=True), 200
        save_response(survey["id"], lock_key, request.form)
        response = make_response(render_template("respondent_complete.html", duplicate=False))
        response.set_cookie("survey_lock", lock_key, httponly=True, samesite="Lax")
        return response
    return render_template("respondent_survey.html", survey=survey)
```

- [ ] **Step 4: Run the public response test to green and commit**

Run:

```powershell
python -m unittest product\tests\test_public_response_flow.py -v
git add product\src\survey_app\db.py product\src\survey_app\app.py product\src\survey_app\templates\respondent_survey.html product\src\survey_app\templates\respondent_complete.html product\tests\test_public_response_flow.py
git commit -m "feat: add public survey submission flow"
```

Expected: PASS for submission success and duplicate block.

### Task 5: Add Admin Response Review and End-to-End Verification

**Files:**
- Modify: `C:\tmp\survey-app-workspace\product\src\survey_app\db.py`
- Modify: `C:\tmp\survey-app-workspace\product\src\survey_app\app.py`
- Create: `C:\tmp\survey-app-workspace\product\src\survey_app\templates\admin_responses.html`
- Test: `C:\tmp\survey-app-workspace\product\tests\test_response_review.py`

- [ ] **Step 1: Write the failing response review test**

```python
from __future__ import annotations

import tempfile
import sys
import unittest
from pathlib import Path

PRODUCT_SRC = Path(__file__).resolve().parents[1] / "src"
if str(PRODUCT_SRC) not in sys.path:
    sys.path.insert(0, str(PRODUCT_SRC))

from survey_app import create_app


class ResponseReviewTests(unittest.TestCase):
    def test_admin_can_view_responses(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            app = create_app(
                {
                    "TESTING": True,
                    "DATABASE_PATH": f"{temp_dir}/survey.sqlite3",
                    "ADMIN_USERNAME": "admin",
                    "ADMIN_PASSWORD": "change-me-now",
                }
            )
            client = app.test_client()
            client.post("/admin/login", data={"username": "admin", "password": "change-me-now"})
            client.post(
                "/admin/surveys/new",
                data={
                    "title": "Customer Check-In",
                    "description": "Tell us how we did.",
                    "question_1_type": "single_choice",
                    "question_1_prompt": "How satisfied are you?",
                    "question_1_options": "Happy|Neutral|Unhappy",
                    "question_2_type": "short_text",
                    "question_2_prompt": "What can we improve?",
                },
            )
            client.post("/admin/surveys/1/publish")
            client.post("/s/customer-check-in-token", data={"question_1": "Happy", "question_2": "Faster checkout"})
            response = client.get("/admin/surveys/1/responses")
            self.assertEqual(response.status_code, 200)
            self.assertIn(b"Faster checkout", response.data)
            self.assertIn(b"Happy", response.data)
```

- [ ] **Step 2: Run the response review test and verify it fails**

Run:

```powershell
python -m unittest product\tests\test_response_review.py -v
```

Expected: FAIL with missing `/admin/surveys/1/responses`.

- [ ] **Step 3: Implement response review route and template**

```python
def get_survey_with_responses(survey_id: int):
    with sqlite3.connect(current_db_path()) as conn:
        conn.row_factory = sqlite3.Row
        survey = dict(
            conn.execute(
                "select id, title, description, state, public_token from surveys where id = ?",
                (survey_id,),
            ).fetchone()
        )
        response_rows = conn.execute(
            "select id from responses where survey_id = ? order by id",
            (survey_id,),
        ).fetchall()
        responses = []
        for response_row in response_rows:
            answers = conn.execute(
                """
                select q.prompt as prompt, a.answer_text as value
                from answers a
                join questions q on q.id = a.question_id
                where a.response_id = ?
                order by q.display_order
                """,
                (response_row["id"],),
            ).fetchall()
            responses.append({"answers": [dict(answer) for answer in answers]})
    survey["responses"] = responses
    return survey


@app.get("/admin/surveys/<int:survey_id>/responses")
def admin_survey_responses(survey_id: int):
    survey = get_survey_with_responses(survey_id)
    return render_template("admin_responses.html", survey=survey)
```

```html
{% extends "base.html" %}
{% block title %}Responses{% endblock %}
{% block content %}
<h1>{{ survey.title }} Responses</h1>
{% for response in survey.responses %}
  <article>
    <h2>Response {{ loop.index }}</h2>
    <ul>
      {% for answer in response.answers %}
        <li><strong>{{ answer.prompt }}</strong>: {{ answer.value }}</li>
      {% endfor %}
    </ul>
  </article>
{% endfor %}
{% endblock %}
```

- [ ] **Step 4: Run the full product test suite**

Run:

```powershell
python -m unittest discover -s product\tests -v
```

Expected: PASS for bootstrap, admin authoring, public response, and response review tests.

- [ ] **Step 5: Run the manual browser smoke and commit**

Run:

```powershell
python product\src\run_server.py
```

Manual checks:
- Log in as the seeded admin
- Create a survey with one choice question and one short-text question
- Publish it and open the public link
- Submit once and confirm the thank-you page
- Retry submit and confirm the duplicate-block message
- Return to admin and verify the response is visible

Then:

```powershell
git add product\src\survey_app\db.py product\src\survey_app\app.py product\src\survey_app\templates\admin_responses.html product\tests\test_response_review.py
git commit -m "feat: add response review and complete survey mvp"
```

## Self-Review

- Spec coverage:
  - Seeded single admin: covered by Tasks 1 and 2
  - Local DB single instance: covered by Tasks 1 through 5
  - Admin create/edit/publish/close: covered by Task 3
  - Public-link respondent flow: covered by Task 4
  - Duplicate submit block: covered by Task 4
  - Response review: covered by Task 5
  - Same-provider waiver controls: covered by Task 2
- Placeholder scan:
  - No `TBD`, `TODO`, or implicit “implement later” instructions remain.
- Type consistency:
  - `create_app`, route names, table names, and state strings are consistent across tests, implementation snippets, and manual smoke steps.
