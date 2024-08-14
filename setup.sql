DROP DATABASE IF EXISTS cs375shooterproject;
CREATE DATABASE cs375shooterproject;
\c cs375shooterproject
CREATE TABLE foo (
	id SERIAL PRIMARY KEY,
	datum TEXT
);
