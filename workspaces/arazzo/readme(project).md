## Stuff to know
- in this repo the arazzo-extension-OTeL-v2 is the correct branch to be working on. as of now it is upto date with the wso2 arazzo-extension branch (I did a git pull origin arazzo-extension). this means it has the latest arazzo visulaizer plugin updates
- other than the plugin code it also has the explanation.md fully updated and pushed
- as for the arazzo-extension-cliupdate-v3 branch don't use it. it just has the --docker flag and the -o flag added to the cli and the pllan.md files in addition to this branch which are not usefull for the plugin. those are some of the personal updates done (needed them for the CLI tool in the arazzo-mcp-generator)
- so in the future make sure to use this v2 branch and continue

## Starting
- need to have go(0.26 something) and node(i used 25) installed
- update the rush.json to be compatible with the node version
- do rush install (later if needed rush update. this can be useful if rush build is failing)
- the rush build -t arazzo-visualizer
- both need to be run from where the rush.json is at
- then in the run and debug select the arazzo-visualizer and run
- then go to workspaces/arazzo/arazzo-designer-visualizer and type npm run start to start the UI
- to build the CLI go to arazzo-designer-cli and type .\build-binaries.ps1   
- this will build the binaries and copy it to the arazzo-desigenr-cli/cli(not neeed but good for the code structure) and to arazzo-designer-extension/ci(needed)
- Later on as for next steps see of the arazzo-mcp-generator repo has complete binaries. if so they can be directly taken and put in the arazzo-designer-extension/cli (this is not done yet and when this is done the arazzo-designer-cli will no longer be needed)

## Future work
- Complete the arazzo-mcp-generator repo and replace the binaries in the plugin with those
- add askills.md file to teach copilot to create arazzo files

PS: when working on this project i had the wso2/arazzo-extension as origin and HimethW/(mybranch) as myfork remotes

PS: to connect a mcp with vscode create .vscode/mcp.json and 
{
  "servers": {
    "arazzo": {
      "type": "http",
      "url": "http://localhost:9900/mcp"
    }
  }
}