const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
module.exports = app;
const { open } = require("sqlite");
const path = require("path");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;

//db connection and initialize server
const initalizeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log(`server running on http://localhost:3000/`);
    });
  } catch (error) {
    console.log(`DB ERROR: ${error.message}`);
    process.exit(1);
  }
};

initalizeDBandServer();

// authentication Token
const authenticationToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
    // console.log(jwtToken);
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "iadfjkalamsecretkajsklajtoken", (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

// Login
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username='${username}'`;
  const dbPath = await db.get(selectUserQuery);
  if (dbPath === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbPath.password);
    if (isPasswordMatched) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "iadfjkalamsecretkajsklajtoken");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//Returns a list of all states in the state table
app.get("/states/", authenticationToken, async (request, response) => {
  const getStatesQuery = `SELECT state_id AS stateId, state_name AS stateName,population FROM state`;
  const states = await db.all(getStatesQuery);
  response.send(states);
});

// Returns a state based on the state ID
app.get("/states/:stateId/", authenticationToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
  SELECT state_id AS stateId, state_name AS stateName,population 
  FROM state
  WHERE state_id =${stateId}`;
  const state = await db.get(getStateQuery);
  response.send(state);
});

// post API 4 add a district
app.post("/districts/", authenticationToken, async (request, response) => {
  try {
    const districtDetails = request.body;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = districtDetails;

    const addDistrictQuery = `INSERT INTO
    district (district_name, state_id, cases, cured, active, deaths)
    VALUES ('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
    await db.run(addDistrictQuery);
    response.send("District Successfully Added");
  } catch (e) {
    console.log(`Post Error: ${e.message}`);
  }
});

//get API 5 districts
app.get(
  "/districts/:districtId/",
  authenticationToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictsQuery = `SELECT district_id AS districtId,
  district_name AS districtName, state_id AS stateId, cases, cured, active, deaths
   FROM district
   WHERE district_id=${districtId}`;
    const districts = await db.get(getDistrictsQuery);
    response.send(districts);
  }
);

// delete API 6 district
app.delete(
  "/districts/:districtId/",
  authenticationToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrictQuery = `DELETE FROM district WHERE district_id=${districtId}`;
    await db.run(deleteDistrictQuery);
    response.send("District Removed");
  }
);

// put API 7 update district
app.put(
  "/districts/:districtId/",
  authenticationToken,
  async (request, response) => {
    try {
      const { districtId } = request.params;
      const districtDetails = request.body;
      const {
        districtName,
        stateId,
        cases,
        cured,
        active,
        deaths,
      } = districtDetails;
      const updateDistrictQuery = `UPDATE district 
  SET district_name='${districtName}', state_id=${stateId}, cases=${cases}, cured=${cured}, active=${active}, deaths=${deaths}
  WHERE district_id = ${districtId}`;
      await db.run(updateDistrictQuery);
      response.send("District Details Updated");
    } catch (e) {
      console.log(`Put ERROR: ${e.message}`);
    }
  }
);

//get API 8 total cases etc
app.get(
  "/states/:stateId/stats/",
  authenticationToken,
  async (request, response) => {
    try {
      const { stateId } = request.params;
      const statisticsQuery = `SELECT SUM(cases) AS totalCases,SUM(cured) AS totalCured,SUM(active) AS totalActive,SUM(deaths) AS totalDeaths
    FROM district
  WHERE state_id =${stateId}`;
      const results = await db.get(statisticsQuery);
      response.send(results);
    } catch (e) {
      console.log(`GET ERROR: ${e.message}`);
    }
  }
);

//get API 9 state name using district_id
app.get(
  "/districts/:districtId/details",
  authenticationToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getStateNameQuery = `SELECT state_name As stateName 
  FROM state NATURAL JOIN district
   WHERE district_id=${districtId}`;
    const stateName = await db.get(getStateNameQuery);
    response.send(stateName);
  }
);
