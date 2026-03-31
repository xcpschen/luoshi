import { ipcRenderer } from "electron";
import type { ClusterConfig, ClusterStatus, ServerConfig } from "../../../src/types/ClusterConfig";

const get = async (): Promise<ClusterConfig> => {
    return await ipcRenderer.invoke("cluster-config:get");
};

const save = async (config: ClusterConfig): Promise<boolean> => {
    return await ipcRenderer.invoke("cluster-config:save", config);
};

const getStatus = async (): Promise<ClusterStatus> => {
    return await ipcRenderer.invoke("cluster-status:get");
};

const addNode = async (node: ServerConfig): Promise<boolean> => {
    return await ipcRenderer.invoke("cluster-node:add", node);
};

const updateNode = async (node: ServerConfig): Promise<boolean> => {
    return await ipcRenderer.invoke("cluster-node:update", node);
};

const deleteNode = async (nodeId: string): Promise<boolean> => {
    return await ipcRenderer.invoke("cluster-node:delete", nodeId);
};

const listNodes = async (): Promise<ServerConfig[]> => {
    return await ipcRenderer.invoke("cluster-node:list");
};

const testNode = async (node: ServerConfig): Promise<{ success: boolean; message: string }> => {
    return await ipcRenderer.invoke("cluster-node:test", node);
};

export default {
    get,
    save,
    getStatus,
    addNode,
    updateNode,
    deleteNode,
    listNodes,
    testNode,
};
