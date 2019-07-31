import * as assert from 'assert';
import request from 'request-promise';

export interface IRegistryClientInitOption {
    url: string;
}

export interface IRegistryOption {
    name: string;            //名称
    ip: string;             //ip地址
    port: number;           //端口号
    id?: string;            //唯一ID
    createdAt?: number;     // 创建时间
    refreshAt?: number;     //上次刷新时间
    status?: number;    // 1. 启用 0. 未启用 -1. 超时
}


export class RegistryClient {
    private isInit = false;
    private url!: string;
    private heartTimer: NodeJS.Timeout|undefined;
    private heartInterval = 60 * 1000;
    private appInfo: IRegistryOption|undefined;

    init(options: IRegistryClientInitOption) {
        this.url = options.url;
        this.isInit = true;
    }

    async registry(options: IRegistryOption) {
        this.checkInit();
        this.appInfo = options;
        if (!this.appInfo.id) {
            this.appInfo.id = this.appInfo.name + '-' + this.appInfo.ip + '-' + this.appInfo.port
        }
        this.appInfo.createdAt = Date.now();
        this.appInfo.refreshAt = Date.now();
        if (this.appInfo.status == undefined) {
            this.appInfo.status = 1;
        }
        //注册服务
        await this.doRegistry(0);
        //启动计时器刷新服务
        this.heartTimer = setInterval( () => {
            return this.heart();
        }, this.heartInterval);
    }

    private async doRegistry(tryNumber: number = 0) :Promise<any> {
        const MAX_TRY = 5;
        if (tryNumber >= MAX_TRY) {
            throw new Error(`has try ${tryNumber} to registry app, but fail!`);
        }
        if (!this.appInfo || !this.appInfo.name ||!this.appInfo.ip || !this.appInfo.port) {
            throw new Error(`registry param invalid need name,ip,port optional id!`);
        }
        try {
            await request.post(this.url, {
                body: this.appInfo
            });
        } catch(err) {
            return this.doRegistry(++tryNumber);
        }
    }

    async unRegistry() {
        //清除计时器
        if (this.heartTimer) {
            clearInterval(this.heartTimer);
        }
        if (!this.appInfo) {
            return;
        }
        const url = this.url + '/' + this.appInfo.id;
        //开始清理程序
        await request.delete(url, {
            body: this.appInfo,
        });
        this.appInfo = undefined;
    }

    async heart() {
        if (!this.appInfo) {
            return;
        }
        const url = this.getUrl(this.appInfo.id as string);
        await request.put(url);
    }

    private getUrl(endfix: string) {
        return this.url + '/' + endfix;
    }

    checkInit() {
        assert.equal(this.isInit, true, "call init before call registry!")
    }

}

const registryClient = new RegistryClient();
export default registryClient;