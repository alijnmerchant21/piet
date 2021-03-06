/**  
 *   This file is part of Piet.
 *
 *   Copyright (C) 2019  Heiko Burkhardt <heiko@slock.it>, Slock.it GmbH
 *
 *   This program is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   This program is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU General Public License for more details.
 *
 *   Permissions of this strong copyleft license are conditioned on
 *   making available complete source code of licensed works and 
 *   modifications, which include larger works using a licensed work,
 *   under the same license. Copyright and license notices must be
 *   preserved. Contributors provide an express grant of patent rights.
 *   
 *   You should have received a copy of the GNU General Public License
 *   along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as joint from 'jointjs';
import { Contract, NodeElement, SolidityAnnotation } from '../../../solidity-handler/SolidityHandler';

// const link = joint.dia.Link.extend({
//     markup: '<path class="connection"/><path class="marker-target"/><g class="labels" />'
// })

const defaultConnector: string = 'normal'; // normal, rounded, jumpo
const defaultRouterName: string = 'manhattan'; // manhattan, metro, oneSide, orthogonal

export const iconRect: any = joint.shapes.basic.Rect.extend({

    markup: '<g class="rotatable"><g class="scalable"><rect /></g><g class="scalable"><image></image></g><text/></g>',
    defaults: joint.util.deepSupplement(
        {
            attrs: {
                text: {
                    event: 'element:text:pointerdown',
                    'ref-x': 30,
                    'x-alignment': 'left',
                    ref: 'rect',
               
                cursor: 'pointer'
                },
                image: {color: '#ffffff', 'ref-x': 6, 'ref-y': 10, ref: 'rect', width: 20, height: 20}
            }
        },                                  
        joint.shapes.basic.Rect.prototype.defaults
    )

});

export const inheritanceLinkHighlighted: any = {
    '.marker-target': { stroke: '#fe8550', fill: '#fe8550', d: 'M 10 0 L 0 5 L 10 10 z' },
    '.connection': { 'stroke-width': 4, stroke: '#fe8550' }
};

export const inheritanceLinkNotHighlighted: any = {
    '.marker-target': { stroke: '#8e8e8e', fill: '#8e8e8e', d: 'M 10 0 L 0 5 L 10 10 z' },
    '.connection': { 'stroke-width': 2, stroke: '#8e8e8e' }
};

export const otherLinkHighlighted: any = {
    '.marker-target': { stroke: '#fe8550', fill: '#fe8550', d: 'M 10 0 L 0 5 L 10 10 z' },
    '.connection': { 'stroke-width': 4, stroke: '#fe8550' }
};

export const otherLinkNotHighlighted: any = {
    '.marker-target': { stroke: '#8e8e8e', fill: '#8e8e8e', d: 'M 10 0 L 0 5 L 10 10 z' },
    '.connection': { 'stroke-width': 2, stroke: '#8e8e8e' }
};

export const contractNodeHighlighted: (contract: any) => any = (contract: any): any => ({ 
    rect: { 
        class: (!contract.source ? 'error-node' :
        contract.isAbstract || contract.isInterface ? 'interface-node' : 'contract-node') + ' node-highlighted',
        rx: 1,
        ry: 2

    },
    text: { 
        class: 'node-text',
        text: cutText(contract.name),
        'font-size': 12
    }, 
    image: {
        'xlink:href': !contract.source ? 'assets/exclamation-circle-solid.svg' :
            contract.kind === 'library' ? 'assets/book-solid.svg' :
                contract.kind === 'contract' && contract.isAbstract ? 'assets/file.svg' : 
                    (contract.kind === 'interface' ? 'assets/file-alt.svg' : 'assets/file-contract-solid.svg')
    }

});

export const contractNodeNotHighlighted: (contract: any) => any = (contract: any): any => ({
   
    rect: { 
        class: !contract.source ? 'error-node' :
            (contract.isAbstract || contract.isInterface ? 'interface-node' : 'contract-node'),
        rx: 1,
        ry: 2
    },
    text: { 
        class: 'node-text',
        text: cutText(contract.name),
        'font-size': 12

    }, 
    image: {
        'xlink:href': !contract.source ? 'assets/exclamation-circle-solid.svg' :
            contract.kind === 'library' ? 'assets/book-solid.svg' :
                contract.kind === 'contract' && contract.isAbstract ? 'assets/file.svg' : 
                    (contract.kind === 'interface' ? 'assets/file-alt.svg' : 'assets/file-contract-solid.svg')
    }
});

export const enumNotHighlighted: (enumName: string) => any = (enumName: string): any => ({ 
    rect: { 
        class: 'enum-node',
        rx: 5,
        ry: 10
    },
    text: { 
        text: cutText(enumName),
        // 'font-family': 'monospace',
        'font-size': 12,
        class: 'node-text'

    }, 
    image: {
        'xlink:href': 'assets/list-ol.svg'
    }
});

export const enumHighlighted: (enumName: string) => any = (enumName: string): any => ({ 
    rect: { 
        class: 'enum-node node-highlighted',
        rx: 5,
        ry: 10

    },
    text: { 
        text: cutText(enumName),
        // 'font-family': 'monospace',
        'font-size': 12,
        class: 'node-text'
        
    }, 
    image: {
        'xlink:href': 'assets/list-ol.svg'
    } 
});

export const structNotHighlighted: (structName: string) => any = (structName: string): any => ({ 
    rect: { 
        class: 'struct-node',
        rx: 5,
        ry: 10

    },
    text: { 
        text: cutText(structName),
        // 'font-family': 'monospace',
        'font-size': 12,
        class: 'node-text'
    }, 
    image: {
        'xlink:href': 'assets/stream-solid.svg'
    }
});

export const structHighlighted: (structName: string) => any = (structName: string): any => ({  
    rect: { 
        class: 'struct-node node-highlighted',
        rx: 5,
        ry: 10
    },
    text: { 
        text: cutText(structName),
        // 'font-family': 'monospace',
        'font-size': 12,
        class: 'node-text'
    }, 
    image: {
        'xlink:href': 'assets/stream-solid.svg'
    }
});

export interface NodeNameIdPair {
    jointjsNode: joint.shapes.basic.Rect;
    nodeElement: NodeElement;
    inheritanceLinks: joint.dia.Link[];
    otherLinks: joint.dia.Link[];
}

export function inheritanceLink(sourceId: string, targetId: string): joint.dia.Link {
    return new joint.dia.Link({
        source: { id: sourceId },
        target: { id: targetId },
        router: { name: defaultRouterName },
        connector: { name: defaultConnector },
        attrs: inheritanceLinkNotHighlighted
    });
}

export function contractElementLink(sourceId: string, targetId: string): joint.dia.Link {
    return new joint.dia.Link({
        source: { id: sourceId },
        target: { id: targetId },
        
        router: { 
            name: defaultRouterName,
            args: {
            
                // endDirections: ['bottom', 'top']

            }
        },
        connector: { name: defaultConnector },
        attrs: otherLinkNotHighlighted
    });
}

export function contractNode(contract: Contract):  joint.shapes.basic.Rect {
    
    return new iconRect({
        size: { width: contract.name.length * 8 + 10, height: 40 },
        
        attrs: contractNodeNotHighlighted(contract)
    });
}

export function enumerationNode(enumerationName: string):  joint.shapes.basic.Rect {
    return new iconRect({
        size: { width: enumerationName.length * 8 + 10, height: 40 },
        attrs: enumNotHighlighted(cutText(enumerationName))
    });
}

export function structNode(structName: string):  joint.shapes.basic.Rect {
    return new iconRect({
        size: { width: structName.length * 8 + 10, height: 40 },
        attrs: structNotHighlighted(cutText(structName))
    });
}

function cutText(text: string): string {
    return text.length > 18 ? text.substr(0, 15) + '...' : text;
}

joint.shapes.basic.Rect = iconRect;