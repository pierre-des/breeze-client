import { BreezeEvent } from './event';
import { AbstractDataServiceAdapter} from './abstract-data-service-adapter';
import { DataService, DataServiceConfig, JsonResultsAdapter, JsonResultsAdapterConfig, NodeContext } from './data-service';
import { DataType  } from './data-type';
import { EntityAction } from './entity-action';
import { EntityAspect, ComplexAspect, Entity, StructuralObject } from './entity-aspect';
import { EntityKey } from './entity-key';
import { EntityManager, EntityManagerConfig, EntityError, EntityChangedEventArgs, SaveContext, SaveBundle, HttpResponse, KeyMapping, ServerError, SaveResult, QueryResult } from './entity-manager';
import { EntityQuery, FilterQueryOp, BooleanQueryOp, OrderByClause, ExpandClause, SelectClause } from './entity-query';
import { EntityState } from './entity-state';
import { InterfaceRegistry, AjaxAdapter, AjaxConfig, DataServiceAdapter, ModelLibraryAdapter, ChangeRequestInterceptor, UriBuilderAdapter, InterfaceRegistryConfig } from './interface-registry';
import { KeyGenerator } from './key-generator';
import { LocalQueryComparisonOptions } from './local-query-comparison-options';
import { MappingContext } from './mapping-context';
import { MetadataStore, EntityType, ComplexType, StructuralType, DataProperty, EntityProperty, NavigationProperty, AutoGeneratedKeyType   } from './entity-metadata';
import { NamingConvention } from './naming-convention';
import { Predicate, VisitContext, Visitor, ExpressionContext, UnaryPredicate, BinaryPredicate, AnyAllPredicate, AndOrPredicate, LitExpr, FnExpr, PropExpr } from './predicate';
import { QueryOptions,  FetchStrategy, MergeStrategy } from './query-options';
import { SaveOptions } from './save-options';
import { ValidationError, Validator } from './validate';
import { ValidationOptions } from './validation-options';
// import { assertParam, assertConfig, Param } from './assert-param';
import { config, BaseAdapter } from './config';
import { core } from './core';
import { makeRelationArray, makePrimitiveArray, makeComplexArray } from './array';

import { BreezeConfig } from './config';
import { ComplexArray } from './complex-array';
// import { IConfigParam } from './assert-param';
import { RelationArray } from './relation-array';
export { BreezeConfig, ComplexArray, RelationArray };


export {
  AbstractDataServiceAdapter,
  AndOrPredicate,
  AnyAllPredicate,
  AutoGeneratedKeyType,
  BinaryPredicate,
  // BreezeEvent, TODO: not needed here - exposed on breeze obj
  ComplexAspect,
  ComplexType,
  DataProperty,
  DataService,
  DataServiceConfig,
  DataType,
  EntityAction,
  EntityAspect,
  EntityError,
  EntityKey,
  EntityManager,
  EntityManagerConfig,
  EntityChangedEventArgs,
  EntityProperty,
  EntityQuery,
  EntityState,
  EntityType,
  ExpandClause,
  FetchStrategy,
  FilterQueryOp,
  FnExpr,
  AjaxAdapter,
  AjaxConfig,
  BaseAdapter,
  ChangeRequestInterceptor,
  DataServiceAdapter,
  Entity,
  ExpressionContext,
  HttpResponse,
  KeyMapping,
  ModelLibraryAdapter,
  InterfaceRegistry,
  InterfaceRegistryConfig,
  NodeContext,
  SaveBundle,
  SaveContext,
  SaveResult,
  ServerError,
  StructuralObject,
  UriBuilderAdapter,
  VisitContext,
  Visitor,
  JsonResultsAdapter,
  JsonResultsAdapterConfig,
  KeyGenerator,
  LitExpr,
  LocalQueryComparisonOptions,
  MappingContext,
  MergeStrategy,
  MetadataStore,
  NamingConvention,
  NavigationProperty,
  OrderByClause,
  // Param,
  Predicate,
  PropExpr,
  QueryOptions,
  QueryResult,
  SaveOptions,
  SelectClause,
  StructuralType,
  UnaryPredicate,
  Validator,
  ValidationError,
  ValidationOptions,
  // assertConfig,
  // assertParam,
  config,
  core,
  makeComplexArray,
  makePrimitiveArray,
  makeRelationArray,
};

// create a breeze variable here
export const breeze = {
  AbstractDataServiceAdapter: AbstractDataServiceAdapter,
  AutoGeneratedKeyType: AutoGeneratedKeyType,
  BooleanQueryOp: BooleanQueryOp,
  ComplexAspect: ComplexAspect,
  ComplexType: ComplexType,
  DataProperty: DataProperty,
  DataService: DataService,
  DataType: DataType,
  EntityAction: EntityAction,
  EntityAspect: EntityAspect,
  EntityKey: EntityKey,
  EntityManager: EntityManager,
  EntityQuery: EntityQuery,
  EntityState: EntityState,
  EntityType: EntityType,
  Event: BreezeEvent,
  FetchStrategy: FetchStrategy,
  FilterQueryOp: FilterQueryOp,
  InterfaceRegistry: InterfaceRegistry,
  JsonResultsAdapter: JsonResultsAdapter,
  KeyGenerator: KeyGenerator,
  LocalQueryComparisonOptions: LocalQueryComparisonOptions,
  MergeStrategy: MergeStrategy,
  MetadataStore: MetadataStore,
  NamingConvention: NamingConvention,
  NavigationProperty: NavigationProperty,
  OrderByClause: OrderByClause, // for testing only
  Predicate: Predicate,
  QueryOptions: QueryOptions,
  SaveOptions: SaveOptions,
  ValidationError: ValidationError,
  ValidationOptions: ValidationOptions,
  Validator,
  assertConfig: null as any,
  assertParam: null as any,
  config: config,
  core: core,
  makeComplexArray: makeComplexArray,
  makePrimitiveArray: makePrimitiveArray,
  makeRelationArray: makeRelationArray,
  version: "2.0.0-beta.4"
};

// breeze.assertConfig = assertConfig as any;
// breeze.assertParam = assertParam as any;

// no-op for backward compatibility with breeze-bridge2-angular
export namespace promises {
  export interface IPromiseService {}
}

/** @hidden @internal */
declare var window: any;

/** @hidden @internal */
declare var global: any;

/** @hidden @internal */
let win: any;
try {
  win = window ? window : (global ? global.window : undefined);
} catch (e) {

}
if (win) {
  win.breeze = breeze;
}
