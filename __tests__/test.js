const request = require("supertest");
const cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");

let server, agent;

function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async () => {
  await agent
    .post("/session")
    .send({ email: "test@user.com", password: "1234567890" });
};

describe("all tests", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(6000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    await db.sequelize.close();
    server.close();
  });


  test("admin signin", async () => {
    const res = await agent.get("/home");
    expect(res.statusCode).toBe(302);
  });

  test("Admin signin validated", async () => {
    const res = await agent.get("/signup");
    expect(res.statusCode).toBe(200);
    const login = await agent.get("/login");
    expect(login.statusCode).toBe(200);
  });

  test("register new admin", async () => {
    const signupPage = await agent.get("/signup");
    const token = extractCsrfToken(signupPage);
    const res = await agent.post("/users").send({
      name: "admin",
      email: "test@user.com",
      password: "1234567890",
      _csrf: token,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Create an election", async () => {
    let count, newCount;
    const addElection = await agent.get("/elections/new");
    const token = extractCsrfToken(addElection);
    const response = await agent.get("/election");
    count = response.body.elections.length;

    await agent.post("/election").send({
      name: "Election-01",
      _csrf: token,
    });

    await agent.get("/election").then((data) => {
      newCount = data.body.elections.length;
    });
    expect(newCount).toBe(count + 1);
  });

  test("admin signout", async () => {
    login();
    await agent.get("/signout");
    const res = await agent.get("/home");
    expect(res.statusCode).toBe(302);
  });
});