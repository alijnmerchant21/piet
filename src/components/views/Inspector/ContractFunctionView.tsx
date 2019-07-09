/**
 * this file is part of bundesblock-voting
 *
 * it is subject to the terms and conditions defined in
 * the 'LICENSE' file, which is part of the repository.
 *
 * @author Heiko Burkhardt
 * @copyright 2018 by Slock.it GmbH
 */

import * as React from 'react';
import * as Sol from '../../../solidity-handler/SolidityHandler';
import { CodeBox, CodeToShow } from '../../CodeBox';
import { TabEntityType } from '../../View';
import { getFunctionAbi, getFunctionId } from '../../../utils/AbiGenerator';
import { UICreationHandling } from '../ui-creation/UIStructure';
import { ValueBox } from '../ui-creation/InspectorTools/ValueBox';
import { ActionTool } from '../ui-creation/InspectorTools/ActionTool';
import { InputFunctionParams } from '../../shared-elements/InputFunctionParams';
import { OutputFunctionParams } from '../../shared-elements/OutputFunctionParams';
import { callFunction, sendFunction, BlockchainConnection, getAccounts } from '../../../solidity-handler/BlockchainConnector';

interface ContractFunctionViewProps {
    selectedContract: Sol.Contract;
    contracts: Sol.Contract[];
    testMode: boolean;
    blockchainConnection: BlockchainConnection;
    showInheritedMembers: boolean;
    toggleInheritance: Function;
    markCode: Function;
    addTabEntity: Function;
    uiCreationHandling: UICreationHandling;
    selectedTabTypeForView: TabEntityType[];
}

interface ContractFunctionViewState {
    resultBoxIsShown: boolean;
    lastResult: string;
    blockchainErrors: string[];
    lastResultName: string;
    parameterMapping: any[];
    resultMapping: any[];
    functionCollapsed: boolean[];
    codeBoxIsShown: boolean;
    selectedFunction: Sol.ContractFunction;
    codeToShow: CodeToShow;
    
}

export class ContractFunctionView extends React.Component<ContractFunctionViewProps, {}> {
    state: ContractFunctionViewState;

    constructor(props: ContractFunctionViewProps) {
        super(props);
        this.state = {
            resultBoxIsShown: false,
            lastResult: '',
            lastResultName: '',
            parameterMapping: [],
            resultMapping: [],
            functionCollapsed: [],
            selectedFunction: null,
            codeBoxIsShown: false,
            blockchainErrors: [],
            codeToShow: CodeToShow.Solidity
  
        };

        this.showResultBox = this.showResultBox.bind(this);
        this.parameterChange = this.parameterChange.bind(this);
        this.callFunction = this.callFunction.bind(this);
        this.send = this.send.bind(this);
        this.toogleCollapse = this.toogleCollapse.bind(this);
        this.showCodeBox = this.showCodeBox.bind(this);
        this.onShowCode = this.onShowCode.bind(this);
        this.initBlockchainOperation = this.initBlockchainOperation.bind(this);
    }

    showResultBox(show: boolean): void {
        this.setState({resultBoxIsShown: show});
    }

    showCodeBox(show: boolean): void {
        this.setState({codeBoxIsShown: show});
    }

    onShowCode(contractFunction: Sol.ContractFunction, codeToShow: CodeToShow): void {
        this.showCodeBox(true);
        this.setState({selectedFunction: contractFunction, codeToShow: codeToShow});
        
    }

    componentDidMount(): void {
        const numberOfFunctions: number = 
            this.props.selectedContract.functions.length + this.props.selectedContract.inheritedFunctions.length;
        this.setState({
            functionCollapsed: Array(numberOfFunctions).fill(false),
            blockchainErrors: Array(numberOfFunctions).fill(null)
        });
    }

    toogleCollapse(index: number): void {
        
        this.setState((prevState: ContractFunctionViewState) => {
            prevState.functionCollapsed[index] = !prevState.functionCollapsed[index];
            return {functionCollapsed: prevState.functionCollapsed};
        });
    }

    componentWillReceiveProps(nextProps: ContractFunctionViewProps): void {

        if (this.props.selectedContract.name !== nextProps.selectedContract.name) {
            const numberOfFunctions: number = 
                this.props.selectedContract.functions.length + this.props.selectedContract.inheritedFunctions.length;
            this.setState({
                functionCollapsed: Array(numberOfFunctions).fill(false),
                blockchainErrors: Array(numberOfFunctions).fill(null)
            });
        }
    }

    parameterChange(input: string, index: number, functionName: string): void {
 
        this.setState((prevState: ContractFunctionViewState) => {
            if (prevState.parameterMapping[functionName]) {
                prevState.parameterMapping[functionName][index] = input;
            } else {
                prevState.parameterMapping[functionName] = [];
                prevState.parameterMapping[functionName][index] = input;
            }
            return {parameterMapping: prevState.parameterMapping};
        });

    }

    getOperationButton(contract: Sol.Contract, contractFunction: Sol.ContractFunction): JSX.Element {
        if (!this.props.testMode || !contract.deployedAt) {
            return null;
        }

        const showEye: boolean = Sol.isCallAble(contractFunction);

        if (showEye) {
            return <button
                        type='button'
                        className='function-operation-button btn btn-outline-primary btn-sm' 
                        onClick={() => this.callFunction(contractFunction)}
                    >
                            Call
                    </button>;
                 
        } else {
            return  <button 
                        type='button'
                        className='function-operation-button btn btn-outline-primary btn-sm' 
                        onClick={() => this.send(contractFunction)}
                    >
                            Send
                    </button>;
                    
        }
        
    }

    isSameFunction(a: Sol.ContractFunction, b: Sol.ContractFunction): boolean {
        let isSame: boolean = a.name === b.name && a.params.length === b.params.length;
        if (isSame) {
            a.params.forEach((param: Sol.ContractFunctionParam, index: number) => {
                isSame = isSame ? 
                    param.name === b.params[index].name && param.solidityType.name === b.params[index].solidityType.name : false;
            });
        }
        return isSame;
    }

    getFunctionIndex(contractFunction: Sol.ContractFunction): number {
        let functionIndex: number = this.props.selectedContract.functions
            .findIndex((cF: Sol.ContractFunction) => this.isSameFunction(cF, contractFunction));
   
        if (functionIndex === -1) {
            const tempFunctionIndex: number = this.props.selectedContract.inheritedFunctions
                .findIndex((cF: Sol.ContractFunction) => this.isSameFunction(cF, contractFunction));
            functionIndex = this.props.selectedContract.functions.length + tempFunctionIndex; 
            
        } 

        return functionIndex;
        
    }

    getFunctionForIndex(functionIndex: number): Sol.ContractFunction {

        if (functionIndex >= this.props.selectedContract.functions.length) {
            return this.props.selectedContract.inheritedFunctions[functionIndex - this.props.selectedContract.functions.length];
        }

        return this.props.selectedContract.functions[functionIndex];

    } 

    async callFunction(contractFunction: Sol.ContractFunction): Promise<void> {
        const name: string = contractFunction.name;
       
        const functionIndex: number = this.getFunctionIndex(contractFunction);
        const theFunction: Sol.ContractFunction = this.getFunctionForIndex(functionIndex);

        this.initBlockchainOperation(name, theFunction, functionIndex);

        let result: any; 
        const error: any = null;
        result = await callFunction(
            contractFunction,
            this.props.blockchainConnection,
            this.props.selectedContract.deployedAt,
            getFunctionAbi(theFunction, this.props.contracts, this.props.selectedContract),
            this.state.parameterMapping[theFunction.name]
        );

        this.setState((prevState: ContractFunctionViewState) => {
            if (prevState.resultMapping[name]) {
                prevState.resultMapping[name] = result;
            } else {
                prevState.resultMapping[name] = [];
                prevState.resultMapping[name] = result;
            }
            return {parameterMapping: prevState.parameterMapping};
        });

        this.setState((prevState: ContractFunctionViewState) => {
            prevState.blockchainErrors[functionIndex] = error;
            return {
                lastResultName: name,
                lastResult: '',
                blockchainErrors: prevState.blockchainErrors
            };
        });
        
    }

    initBlockchainOperation(name: string, theFunction: Sol.ContractFunction, functionIndex: number): void {

        
        for (const index of Object.keys(theFunction.returnParams)) {
            this.setState((prevState: ContractFunctionViewState) => {
                if (prevState.resultMapping[name]) {
                    prevState.resultMapping[name][index] = '';
                } else {
                    prevState.resultMapping[name] = [];
                    prevState.resultMapping[name][index] = '';
                }

                return {parameterMapping: prevState.parameterMapping};
            });
        }
        
        
        this.setState((prevState: ContractFunctionViewState) => {
            prevState.blockchainErrors[functionIndex] = null;
            return {
                lastResult: '',
                blockchainErrors: prevState.blockchainErrors
            };
        });
    }

    async send(contractFunction: Sol.ContractFunction): Promise<void> {
        const functionIndex: number = this.getFunctionIndex(contractFunction);
        const theFunction: Sol.ContractFunction = this.getFunctionForIndex(functionIndex);
        const name: string = contractFunction.name;

        this.initBlockchainOperation(name, theFunction, functionIndex);
        const accounts: any[] = await getAccounts(this.props.blockchainConnection);
        
        if (accounts.length > 0) {

            let error: any = null;
            let result: any; 
            try {
                result = await sendFunction(
                    contractFunction,
                    this.props.blockchainConnection,
                    this.props.selectedContract.deployedAt,
                    getFunctionAbi(theFunction, this.props.contracts, this.props.selectedContract),
                    this.state.parameterMapping[name]
                );
          
            } catch (e) {
                error = e;
            } finally {

            if (typeof result === 'object') {
                this.props.addTabEntity({
                    active: true,
                    contentType: TabEntityType.Json,
                    removable: true,
                    name: name + ' Tx',
                    content: result,
                    icon: 'sign-out-alt'
                
                },                      1, true);

            }

            result = result ? typeof result === 'object' ? JSON.stringify(result) : result.toString() : null;
            
            this.setState((prevState: ContractFunctionViewState) => {
                prevState.blockchainErrors[functionIndex] = error ? error.message : null;
                return {
                    lastResultName: name,
                    lastResult: result,
                    blockchainErrors: prevState.blockchainErrors
                };
            });
            }

        }
    }

    getFunctionList(contract: Sol.Contract, inherited: boolean): JSX.Element[] {
        
        const functions: Sol.ContractFunction[] = inherited ? contract.inheritedFunctions : contract.functions;
        const functionIndexOffset: number = inherited ? contract.functions.length : 0;

        if (!this.props.showInheritedMembers && inherited) {
            if (contract.inheritedFunctions.length === 0) {
                return null;
            }

            return  [<div className='selected-list-item list-group-item list-group-item-action flex-column align-items-start'
                        key={'function' + contract.name + 'inheritedInfo'}>
                        <small>
                            <a href='#' onClick={() => {this.props.toggleInheritance(); }} className={'text-muted'}>
                                {contract.inheritedFunctions.length}
                                &nbsp;inherited function{contract.inheritedFunctions.length === 1 ? '' : 's'}
                            </a>
                        </small>
                    </div>];
        }
        
        return functions.map((contractFunction: Sol.ContractFunction, functionIndex: number) => {

            const params: JSX.Element[] = [];
            contractFunction.params.forEach((param: Sol.ContractFunctionParam, index: number) => {
                params.push(
                    <InputFunctionParams 
                        key={'param' + contract.name + param.name}
                        index={index}
                        contractFunctionName={contractFunction.name}
                        contractAddress={contract.deployedAt}
                        inputParameterChange={this.parameterChange}
                        interactiveMode={this.props.testMode}
                        parameter={param}
                        blockchainConnection={this.props.blockchainConnection}
                    />
                );
            });
            const returnParams: JSX.Element[] = [];
            contractFunction.returnParams.forEach((param: Sol.ContractFunctionParam, index: number) => {
                returnParams.push(
                    <OutputFunctionParams 
                        contractAddress={contract.deployedAt}
                        key={'returnParam' 
                            + contract.name 
                            + contractFunction.name 
                            + param.name 
                            + index
                        }
                        resultMapping={this.state.resultMapping}
                        index={index}
                        contractFunctionName={contractFunction.name}
               
                        interactiveMode={this.props.testMode}
                        parameter={param}
                    />
                );
            });

            const modifiers: JSX.Element[] = [];
            let showEye: boolean = false;
            contractFunction.modifiers.forEach((modifier: string) => {
                if (modifier === 'view' || modifier === 'pure' || modifier === 'constant') {
                    showEye = true;
                }
                modifiers.push(
                    <span className='badge badge-secondary modifier-badge' key={'modifier' + contract.name + modifier}>
                        {modifier}
                    </span>
                );
            });

            let abi: any = null;
            try {
                abi = getFunctionAbi(contractFunction, this.props.contracts, this.props.selectedContract);
            } catch (e) {
                console.log('could not create abi for ' + contractFunction.name);
            }

            const functionKey: string = getFunctionId(contract, this.props.blockchainConnection, contractFunction);
            
            return  <div 
                        className='
                            member-parent-container
                            selected-list-item
                            list-group-item
                            list-group-item-action
                            flex-column
                            align-items-start
                            with-detailed-view'
                        key={functionKey}
                    >
                 
                        <div className='member-container'>
                            <div className='left-member'>
                                <button 
                                    data-target={'.functionContent' + functionKey}
                                    data-toggle='collapse'
                                    type='button'
                                    onClick={() => this.toogleCollapse(functionIndexOffset + functionIndex)}
                                    className='btn btn-outline-dark detailed-button left-member'
                                >
                                    <div className={(this.state.functionCollapsed[functionIndexOffset + functionIndex] ? '' : ' dontShow')}>
                                        <i className='fas fa-angle-down'></i>
                                    </div> 
                                    <div className={(this.state.functionCollapsed[functionIndexOffset + functionIndex] ? ' dontShow' : '')}>
                                        <i className='fas fa-angle-right'></i>
                                    </div>
                                    
                                </button>
                            </div>
                            <div className='right-member'>
                                <div className='d-flex w-100 justify-content-between full-block'>
                                    <div className='full-block'>
                                        <strong>
                                            <span className={'member-name' }>
                                                {/* <a 
                                                    href='#' 
                                                    className={(inherited ? ' text-muted' : '')} 
                                                    onClick={() => 
                                                        this.props.markCode(contractFunction.start, contractFunction.end, contract)}
                                                >
                                                    {contractFunction.name}()
                                                </a> */}
                                                <span className={(inherited ? ' text-muted' : '')}>{contractFunction.name}()</span>
                                            </span>
                                        </strong>
                                        {   abi 
                                            && contractFunction.params.length === 0 
                                            && contractFunction.returnParams.length === 1 
                                            && contractFunction.returnParams[0].solidityType.userDefined === false
                                            &&  this.props.selectedTabTypeForView[1] === TabEntityType.UICreationView &&
                                            <ValueBox 
                                                placeHolderName={contractFunction.name}
                                                uiCreationHandling={this.props.uiCreationHandling}
                                                contractAddress={contract.deployedAt}
                                                abi={abi}
                                                stateVariableName={contractFunction.name}
                                            />
                                        }
                                        {
                                            (contractFunction.params.length !== 0 
                                            || contractFunction.returnParams.length !== 1) 
                                            && abi
                                            &&  this.props.selectedTabTypeForView[1] === TabEntityType.UICreationView &&
                                            <ActionTool 
                                                callAble={Sol.isCallAble(contractFunction)}
                                                contractFunction={contractFunction}
                                                placeHolderName={contractFunction.name}
                                                uiCreationHandling={this.props.uiCreationHandling}
                                                contractAddress={contract.deployedAt}
                                                abi={abi}
                                              
                                            />
                                        }
                                        <div className={'full-block collapse functionContent' + functionKey} >
                                            {modifiers}
                                            <div className='param param-doc'>   
                                                {contractFunction.description ? 
                                                    <small>
                                                        <i className='text-muted'>{contractFunction.description}</i><br />
                                                    </small> 
                                                : null}
                                            </div>
                                            {params.length > 0 ? <small>{params}</small> : null} 
                                
                                            {returnParams.length > 0 ? <small>{returnParams}</small> : null}
                                            {this.state.blockchainErrors[functionIndexOffset + functionIndex] ? 
                                                <div className='alert alert-danger param-content' role='alert'>
                                                    <small>{this.state.blockchainErrors[functionIndexOffset + functionIndex]}</small>
                                                </div>
                                             : null}
                                            
                                            <div className='text-right functionOperations'>
                                                <button 
                                                    type='button'
                                                    className='function-operation-button btn btn-outline-secondary btn-sm'
                                                    data-toggle='modal' 
                                                    data-target={'.codeModal'}
                                                    onClick={() => this.onShowCode(contractFunction, CodeToShow.Abi)}
                                                >
                                                    ABI
                                                </button>
                                                <button 
                                                    type='button'
                                                    className='function-operation-button btn btn-outline-secondary btn-sm'
                                                    data-toggle='modal' 
                                                    data-target={'.codeModal'}
                                                    onClick={() => this.onShowCode(contractFunction, CodeToShow.Solidity)}
                                                >
                                                    Code
                                                </button>
                                                {this.getOperationButton(contract, contractFunction)}
                                           
                                            </div>

                                        </div>
                                    </div>
                                    <div>
                                        {showEye ? <i className='fas fa-eye' title='Can not change the state'></i> 
                                        : <i className='fas fa-eye-slash text-muted' title='Can change the state'></i>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>;
        });

    }

    render(): JSX.Element {
        if (this.props.selectedContract.functions.length === 0 && this.props.selectedContract.inheritedFunctions.length === 0) {
            return null;
        }

        return  <div>
                    {/* <ResultBox resultBoxIsShown={this.state.resultBoxIsShown} name={this.state.lastResultName}
                    showResultBox={this.showResultBox} result={this.state.lastResult} id={'Function' + this.props.selectedContract.name} /> */}
                    <CodeBox 
                        codeToShow={this.state.codeToShow}
                        blockchainConnection={this.props.blockchainConnection}
                        contracts={this.props.contracts}
                        codeBoxIsShown={this.state.codeBoxIsShown}
                        showCodeBox={this.showCodeBox}
                        selectedFunction={this.state.selectedFunction}
                        contextContract={this.props.selectedContract}
                    />
                    <h5 className='member-headline'><i className='fas fa-align-justify'></i> Functions</h5>
                    <div className='list-group'>
                        {this.getFunctionList(this.props.selectedContract, false)}
                        {this.getFunctionList(this.props.selectedContract, true)}
                    </div>
                    <br />
                </div>;
    }
    
}