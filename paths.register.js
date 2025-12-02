const tsconfigPaths = require('tsconfig-paths')
tsconfigPaths.register({ baseUrl: __dirname + '/dist', paths: { '@/*': ['*'] } })
