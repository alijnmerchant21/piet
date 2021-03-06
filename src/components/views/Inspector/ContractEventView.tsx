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

import * as React from 'react';
import * as Sol from '../../../solidity-handler/SolidityHandler';
import { EventTool } from '../ui-creation/InspectorTools/EventTool';
import { getEventAbi } from '../../../utils/AbiGenerator';
import { UICreationHandling } from '../ui-creation/UIStructure';
import { TabEntityType } from '../../View';
import { BlockchainConnection } from '../../../solidity-handler/BlockchainConnector';

interface ContractEventViewProps {
    contracts: Sol.Contract[];
    blockchainConnection: BlockchainConnection;
    selectedTabTypeForView: TabEntityType[];
    uiCreationHandling: UICreationHandling;
    toggleInheritance: Function;
    selectedContract: Sol.Contract;
    showInheritedMembers: boolean; 
    testMode: boolean;
    getEvents: Function;
    
}

interface ContractEventViewState {
    eventCollapsed: boolean[];
}

export class ContractEventView extends React.Component<ContractEventViewProps, {}> {
    state: ContractEventViewState;

    constructor(props: ContractEventViewProps) {
        super(props);
        this.state = {
            eventCollapsed: []
        };

        this.toogleCollapse = this.toogleCollapse.bind(this);
    }

    toogleCollapse(index: number): void {
        
        this.setState((prevState: ContractEventViewState) => {
            prevState.eventCollapsed[index] = !prevState.eventCollapsed[index];
            return {eventCollapsed: prevState.eventCollapsed};
        });
    }

    componentDidMount(): void {
        this.setState({
            eventCollapsed: Array(this.props.selectedContract.events.length + this.props.selectedContract.inheritedEvents.length)
                .fill(false)
        });
    }

    componentWillReceiveProps(nextProps: ContractEventViewProps): void {
        if (this.props.selectedContract.name !== nextProps.selectedContract.name) {
            this.setState({
                eventCollapsed: Array(this.props.selectedContract.events.length + this.props.selectedContract.inheritedEvents.length)
                    .fill(false)
            });
        }
    }

    getEventList (contract: Sol.Contract, inherited: boolean): JSX.Element[] {
        const events: Sol.ContractEvent[] = inherited ? contract.inheritedEvents : contract.events;
        const eventIndexOffset: number = inherited ? contract.events.length : 0;

        if (!this.props.showInheritedMembers && inherited) {
            if (contract.inheritedEvents.length === 0) {
                return null;
            }

            return  [<div className='selected-list-item list-group-item list-group-item-action flex-column align-items-start'
                        key={'event' + contract.name + 'inheritedInfo'}>
                        <small>
                        <a href='#' onClick={() => {this.props.toggleInheritance(); }} className={'text-muted'}>
                                {contract.inheritedEvents.length}
                                &nbsp;inherited event{contract.inheritedEvents.length === 1 ? '' : 's'}
                            </a>
                        </small>
                    </div>];
        }
     
        return events.map((event: Sol.ContractEvent, eventIndex: number) => {
            const params: JSX.Element[] = [];
            event.params.forEach((param: Sol.ContractFunctionParam, index: number) => {
                params.push(
                    <div key={'param' + contract.name + param.name} className='param'>
                        <i className='fas fa-arrow-circle-right' aria-hidden='true'></i>&nbsp;
                        <strong>{param.name}</strong><small>&nbsp;{param.solidityType.name}</small>
                       
                    </div>
                );
            });

            return  <div 
                        className='
                            member-parent-container
                            selected-list-item
                            list-group-item
                            list-group-item-action
                            flex-column
                            align-items-start
                            with-detailed-view'
                        key={'event' + contract.name + event.name}
                    >
                        <div className='member-container'>
                            <div className='left-member'>
                                <button 
                                    data-target={'#event' + contract.name + event.name}
                                    data-toggle='collapse'
                                    type='button'
                                    onClick={() => this.toogleCollapse(eventIndexOffset + eventIndex)} 
                                    className='btn btn-outline-dark detailed-button left-member'
                                >
                                    <div className={(this.state.eventCollapsed[eventIndexOffset + eventIndex] ? '' : ' dontShow')}>
                                        <i className='fas fa-angle-down'></i>
                                    </div> 
                                    <div className={(this.state.eventCollapsed[eventIndexOffset + eventIndex] ? ' dontShow' : '')}>
                                        <i className='fas fa-angle-right'></i>
                                    </div>
                                    
                                </button>
                            </div>
                            <div className='right-member'>
                                <div className='d-flex w-100 justify-content-between'>
                                    <strong>
                                        <span className={'member-name' + (inherited ? ' text-muted' : '')}> 
                                            {event.name} 
                                        </span>
                                    </strong>
                                    <div>
                                    {this.props.testMode  && contract.deployedAt ? 
                                        <button type='button' className='btn btn-outline-secondary btn-sm sv-call' 
                                            onClick={() => {this.props.getEvents(contract, event, event.params); }}>Get</button>
                                        : null
                                    }
                                    </div>
                                </div>
                                {
                            this.props.selectedTabTypeForView[1] === TabEntityType.UICreationView &&
                            <EventTool 
                                placeHolderName={event.name}
                                uiCreationHandling={this.props.uiCreationHandling}
                                contractAddress={contract.deployedAt}
                                abi={getEventAbi(event, this.props.contracts, this.props.selectedContract)}
                                event={event}
                            />
                        }
                                <div className='collapse' id={'event' + contract.name + event.name}>
                                    {params.length > 0 ? <small>{params}</small> : null} 
                                </div>
                            </div>
                                
                        </div>
                    
                    </div>;
            }
        );

    }

    render (): JSX.Element {
        if (this.props.selectedContract.events.length === 0 && this.props.selectedContract.inheritedEvents.length === 0) {
            return null;
        }

        return  <div>
                    <h5 className='member-headline'><i className='fas fa-bell'></i> Events</h5>
                    <div className='list-group'>
                        {this.getEventList(this.props.selectedContract, false)}
                        {this.getEventList(this.props.selectedContract, true)}
                    </div>
                    <br />
                </div>;
    }
    
}