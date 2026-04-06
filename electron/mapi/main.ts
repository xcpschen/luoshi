import config from "./config/main";
import log from "./log/main";
import app from "./app/main";
import storage from "./storage/main";
import db from "./db/main";
import file from "./file/main";
import event from "./event/main";
import ui from "./ui";
import keys from "./keys/main";
import user from "./user/main";
import misc from "./misc/main";
import updater from "./updater/main";
import serve from "./serve/main";
import adb from "./adb/main";
import clusterConfig from "./clusterConfig/main";
import imageRecognition from "./imageRecognition/main";

const $mapi = {
    app,
    log,
    config,
    storage,
    db,
    file,
    event,
    ui,
    keys,
    user,
    misc,
    updater,
    serve,
    adb,
    clusterConfig,
    imageRecognition,
};

export const MAPI = {
    async init() {
        console.log('[MAPI] Starting initialization...');
        // await $mapi.user.init();
        await $mapi.db.init();
        console.log('[MAPI] Database initialized');
        await $mapi.event.init();
        await $mapi.serve.start();
        console.log('[MAPI] Serve started');
        // 传入数据库实例
        const dbInstance = $mapi.db.getInstance();
        await $mapi.clusterConfig.init(dbInstance);
        console.log('[MAPI] ClusterConfig initialized');
        // 暂时禁用图像识别服务初始化
        // await $mapi.imageRecognition.init();
        // $mapi.imageRecognition.register();
        console.log('[MAPI] ImageRecognition disabled for now');
    },
    ready() {
        $mapi.keys.ready();
    },
    destroy() {
        $mapi.keys.destroy();
        $mapi.serve.stop();
        // $mapi.imageRecognition.destroy();
    },
};
