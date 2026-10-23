const version=require('../package.json').version;
if(process.env.GITHUB_REF_NAME!==`v${version}`)throw Error('Git tag must match package.json version');
