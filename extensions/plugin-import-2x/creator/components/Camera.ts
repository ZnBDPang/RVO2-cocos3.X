'use strict';
import { Node } from "./Node";
import { layerToGroupMap } from '../common/utlis';

export const CAMERA = {
    "__type__": "cc.Camera",
    "_name": "",
    "_objFlags": 0,
    "node": null,
    "_enabled": true,
    "__prefab": null,
    "_projection": 1,
    "_priority": 0,
    "_fov": 45,
    "_fovAxis": 0,
    "_orthoHeight": 10,
    "_near": 1,
    "_far": 1000,
    "_color": {
        "__type__": "cc.Color",
        "r": 51,
        "g": 51,
        "b": 51,
        "a": 255,
    },
    "_depth": 1,
    "_stencil": 0,
    "_clearFlags": 7,
    "_rect": {
        "__type__": "cc.Rect",
        "x": 0,
        "y": 0,
        "width": 1,
        "height": 1,
    },
    "_aperture": 19,
    "_shutter": 7,
    "_iso": 0,
    "_screenScale": 1,
    "_visibility": -325058561,
    "_targetTexture": null,
};

export class Camera {

    static addToScene(canvas: any, json3D: any) {
        const canvasID = canvas.node.__id__;
        const canvasNode = json3D[canvasID];
        const cameraNode = Node.create(`UICamera_${canvasNode._name}`, canvasID);
        json3D.push(cameraNode);
        const cameraNodeID = json3D.length - 1;
        canvasNode._children.push({
            __id__: cameraNodeID,
        });
        const camera = Camera.create(cameraNodeID);
        json3D.push(camera);
        const cameraID = json3D.length - 1;
        Node.addComponents(cameraNode, cameraID);
        canvas._cameraComponent = {
            __id__: cameraID,
        };
    }

    static create(nodeID: number) {
        const camera = JSON.parse(JSON.stringify(CAMERA));
        camera.node = {
            __id__: nodeID,
        };
        return camera;
    }

    static async migrate(json2D: any) {
        const source = JSON.parse(JSON.stringify(CAMERA));
        for (const key in json2D) {
            const value = json2D[key];
            if (key === '__type__' || value === undefined || value === null) { continue; }
            if (key === '_cullingMask') {
                source._visibility = value;
            }
            else if (key === '_depth') {
                source._priority = value;
            }
            else if (key === '_backgroundColor') {
                source._color = value;
            }
            else if (key === '_ortho') {
                // ORTHO = 0, PERSPECTIVE = 1
                source._projection =  value === true ? 0 : 1;
            }
            else if (key === '_nearClip') {
                source._near = value;
            }
            else if (key === '_farClip') {
                source._far = value;
            }
            else if (key === '_orthoSize') {
                source._orthoHeight = value;
            }
            else {
                source[key] = value;
            }
        }
        return source;
    }

    static async apply(index: number, json2D: any, json3D: any) {
        const source = await Camera.migrate(json2D[index]);
        json3D.splice(index, 1, source);
        return source;
    }
}
