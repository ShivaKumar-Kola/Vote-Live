/* eslint-disable no-undef */
const express = require("express");
const app = express();
const path = require("path");
const { Admin,Election} = require("./models");
const bcrypt = require("bcrypt");
var cookieParser = require("cookie-parser");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const localStrategy = require("passport-local");
const passport = require("passport");
const flash = require("connect-flash");
const csrf = require("tiny-csrf");
const saltRounds = 10;
const bodyParser = require("body-parser");
app.use(flash());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("ssh! some secret string!"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "super-secretkeyinformation",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, //oneday-24hours
    },
  })
);

app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

app.use(passport.initialize());

app.use(passport.session());
passport.use(
  "admin",
  new localStrategy(
    {
      username: "email",
      password: "password",
    },
    (username, password, done) => {
      Admin.findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Incorrect password" });
          }
        })
        .catch((error) => {
          console.log(error);
          return done(null, false, {
            message: "Email is not registered!",
          });
        });
    }
  )
);
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});
app.get("/", (request, response) => {
  response.render("home");
});
app.get("/login", (request, response) => {
  if (request.user && request.user.id) {
    return response.redirect("/home");
  }
  response.render("login", { csrf: request.csrfToken() });
});

app.get("/register", (request, response) => {
  response.render("register", { csrf: request.csrfToken() });
});
app.get(
  "/election",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const login_admin_id = request.user.id;
    const elections = await Election.findAll({
      where: { adminID: login_admin_id },
    });

    return response.json({ elections });
  }
);
app.get(
  "/home",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const login_admin_id = request.user.id;
    const admin = await Admin.findByPk(login_admin_id);

    const elections = await Election.findAll({
      where: { adminID: request.user.id },
    });

    const username = admin.name;

    response.render("admin", {
      username: username,
      ad_id: login_admin_id,
      elections: elections,
      csrf: request.csrfToken(),
    });
  }
);
app.get(
  "/election/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const login_admin_id = request.user.id;
    const admin = await Admin.findByPk(login_admin_id);

    username = admin.name;
    const elections = await Election.findByPk(request.params.id);

    if (login_admin_id !== elections.adminID) {
      return response.render("error", {
        errorMessage: "You are not permitted to view this page",
      });
    }
}
);

app.delete(
  "/election/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const adminID = request.user.id;
    const election = await Election.findByPk(request.params.id);

    if (adminID !== election.adminID) {
      console.log("You are not permitted to perform this operation");
      return response.redirect("/home");
    }
}
);

app.post(
    "/election",
    connectEnsureLogin.ensureLoggedIn(),
    async (request, response) => {
      if (request.body.name.trim().length === 0) {
        request.flash("error", "name can't be empty");
        return response.redirect("/elections/new");
      }
      const login_admin_id = request.user.id;
      const election = await Election.findOne({
        where: { adminID: login_admin_id, name: request.body.name },
      });
      if (election) {
        request.flash("error", "Election name already used");
        return response.redirect("/elections/new");
      }
      try {
        await Election.add(login_admin_id, request.body.name);
        response.redirect("/home");
      } catch (error) {
        console.log(error);
        response.send(error);
      }
    }
  );
  app.get(
    "/elections/new",
    connectEnsureLogin.ensureLoggedIn(),
    async (request, response) => {
      const login_admin_id = request.user.id;
      const admin = await Admin.findByPk(login_admin_id);
  
      response.render("newElection", {
        username: admin.name,
        csrf: request.csrfToken(),
      });
    }
  );
  app.get(
    "/election/:id/edit",
    connectEnsureLogin.ensureLoggedIn(),
    async (request, response) => {
      const login_admin_id = request.user.id;
      const election = await Election.findByPk(request.params.id);
      const admin = await Admin.findByPk(login_admin_id);
  
      if (login_admin_id !== election.adminID) {
        return response.render("error", {
          errorMessage: "You cannot perform the action",
        });
      }
      response.render("editElection", {
        election: election,
        username: admin.name,
        csrf: request.csrfToken(),
      });
    }
  );
  app.post(
    "/election/:id",
    connectEnsureLogin.ensureLoggedIn(),
    async (request, response) => {
      const login_admin_id = request.user.id;
      const elections = await Election.findByPk(request.params.id);
  
      if (login_admin_id !== elections.adminID) {
        return response.render("error", {
          errorMessage: "You are not permitted to view this page",
        });
      }

      if (request.body.name.trim().length === 0) {
        request.flash("error", "Election name can't be empty");
        return response.redirect(`/election/${request.params.id}/edit`);
      }
      const sameElection = await Election.findOne({
        where: {
          adminID: login_admin_id,
          name: request.body.name,
        },
      });
  
      if (sameElection) {
        if (sameElection.id.toString() !== request.params.id) {
          request.flash("error", "name already used");
          return response.redirect(`/election/${request.params.id}/edit`);
        } else {
          request.flash("error", "No changes made");
          return response.redirect(`/election/${request.params.id}/edit`);
        }
      }
  
      try {
        await Election.update(
          { name: request.body.name },
          { where: { id: request.params.id } }
        );
        response.redirect(`/election/${request.params.id}`);
      } catch (error) {
        console.log(error);
        return response.send(error);
      }
    }
  );

  app.post("/users", async (request, response) => {
    if (request.body.email.trim().length === 0) {
      request.flash("error", "Email can't be empty");
      return response.redirect("/register");
    }
  
    if (request.body.password.length === 0) {
      request.flash("error", "Password can't be empty");
      return response.redirect("/register");
    }
  
    if (request.body.name.length === 0) {
      request.flash("error", "First name can't be empty");
      return response.redirect("/register");
    }
  
    const admin = await Admin.findOne({ where: { email: request.body.email } });
    if (admin) {
      request.flash("error", "Email already exists");
      return response.redirect("/signup");
    }
  
    if (request.body.password.length < 8) {
      request.flash("error", "Password must be atleast 8 characters long");
      return response.redirect("/signup");
    }
    const hashpwd = await bcrypt.hash(request.body.password, saltRounds);
    try {
      const user = await Admin.create({
        name: request.body.name,
        email: request.body.email,
        password: hashpwd,
      });
      request.login(user, (err) => {
        if (err) {
          console.log(err);
          response.redirect("/");
        } else {
          request.flash("success", "registration successful");
          response.redirect("/home");
        }
      });
    } catch (error) {
      request.flash("error", error.message);
      return response.redirect("/register");
    }
  });


  app.get("/signout", (request, response) => {
    request.logout((err) => {
      if (err) {
        return next(err);
      } else {
        response.redirect("/");
      }
    });
  });
  
  app.post(
    "/session",
    passport.authenticate("admin", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    function (request, response) {
      response.redirect("/home");
    }
  );
  
  module.exports = app;

