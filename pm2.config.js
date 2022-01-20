module.exports = {
  apps : [
      {
        name: "sm2t_server",

        /*************** Production Mode */ 
        // script: "/home/zia/sm2t-webmap-vectiles-server/sm2t-server/server.js",
        // instance_var: 'production',
        /*************** */

        /*************** Development Mode */
        script: "/home/zia/sm2t-webmap-vectiles-server/sm2t-server/server.js",
        instance_var: 'development',
        /*************** */

        watch: false,
        ignore_watch : ["/home/zia/sm2t-webmap-vectiles-server/sm2t-server/logger"],
        watch_options: {
          dot: true,
          "followSymlinks": true
        },
        exec_mode: 'cluster_mode',
        instances : 'max',
        env_development: {
            "NODE_ENV": "development",
            "NODE_APP_INSTANCE": "development",
            "NODE_CONFIG_DIR": "/home/zia/sm2t-webmap-vectiles-server/sm2t-server/config"
        },
        env_production: {
            "NODE_ENV": "production",
            "NODE_APP_INSTANCE": "production",
            "NODE_CONFIG_DIR": "/home/zia/sm2t-webmap-vectiles-server/sm2t-server/config"
        }
      }
  ]
}