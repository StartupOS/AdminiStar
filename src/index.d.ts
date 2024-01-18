import express from 'express'
import { compileTemplate } from "pug"
import { BaseEntity, DataSource } from 'typeorm'


/**
 * Only one gets used.
 * 
 * Order of precedence is:
 * 1. Template
 * 2. Template Path
 * 3. Raw HTML
 * 4. HTML Path
 */
interface entityView {
    templatePath?: string,
    htmlPath?: string,
    rawHtml?: string,
    pugTemplate?: compileTemplate
}

interface entityStyle {
    cssPath?: string,
    rawCSS?: string
}

export class test extends BaseEntity{
    id:number
}

export type NativeRoutes =  'list' | 'view'| 'edit'

export type optsType = {
    dataSource: DataSource,
    entities: typeof test[],
    templateDir?: string,
    entitySpecific? : { [entityName: string]: {
        views?: {
            [viewName in NativeRoutes]: entityView
        },
        styles?: {
            [viewName in NativeRoutes]: entityStyle
        },
        routes?: {
            [path: string] : {
                [verb:string]: express.Router
            }
        },
        editableColumns?: string[],
        visibleColumns?: string[],
        hiddenColumns?: string[],
        protectedColumns?: string[]
    }}
    views?:{
        [viewName in NativeRoutes] : entityView
    },
    styles?:{
        [viewName in NativeRoutes]: entityStyle
    },
    routes?: {
        [path: string] : {
            [verb:string]: express.Router
        }
    }
}

interface AdminUser extends Partial<any> {
    administrator?: boolean
}

interface AdminRequest extends Express.Request {
    user?: AdminUser
}

interface IMakeHtmlArgs {
    name:NativeRoutes, 
    locals:any, 
    entity:typeof test
}
