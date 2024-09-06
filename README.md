"# CS375_Project" 
#Instructions on how to run locally
1. make sure line 252 in public/multiplayer-client.js is uncommented and line 249 is commented out.
2. then go to the project directory in your command line shoud be path/to/file/CS375_Project.
3. then run node server.js.
4. and go to http://localhost:3000 locally
5. play test and have fun!

#Instructions on how to deploy the project
1. make sure line 249 is uncommented, and line 252 is commented out in public/multiplayer-client.js
2. then in your command line add everything into github using (git add .), (git commit -m "deployment"), (git push origin main)
3. Wait a few minutes as we've made it so that github automatically deploys the project everytime we push changes.
4. after you've waited a few minutes and ensure the deployment is finished visit: (https://cs375shooterproject.fly.dev/).
5. play test the game, when creating a lobby ensure both players have the unique 4 length lobby code if you're making a
private lobby, otherwise just play the game normally by clicking play now.
6. have fun!
