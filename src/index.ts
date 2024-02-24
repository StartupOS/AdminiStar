import { readFileSync } from 'fs'

import express from 'express'
import jsdom from 'jsdom'
import pug, { compileTemplate } from "pug"
import { BaseEntity, DataSource } from 'typeorm'

import { 
    test,
    optsType,
    entityStyle,
    entityView,
    IMakeHtmlArgs,
    NativeRoutes,
    AdminRequest
 } from './index.d'


export class AdminiStar {
    opts:optsType;
    router = express.Router()
    entities: typeof test[]
    dataSource: DataSource

    constructor(arg:optsType){
        this.opts = arg;
        const d = arg.dataSource;
        const e = d.entityMetadatasMap
        d.manager
    }

    private static renderHTML(args:{templatePath:string, templateArgs:any}):string{
        const {templatePath, templateArgs} = args
        let template:compileTemplate;
        let html:string;
        try{
            template = pug.compileFile(templatePath)
        } catch (ex){
            return 'template not found'
        }
        try {
            html = template(templateArgs)
        } catch (ex){
            return 'invalid template variables'
        }
        return html
    }

    private static async makeHtmlFromOpts(v:entityView, locals:any):Promise<string>{
        let html:string = "<html><body>Invalid Options</body></html>";
        if(v.pugTemplate){
            html = await v.pugTemplate(locals);
        } else {
            if(v.templatePath){
                const templatePath = v.templatePath
                html = await AdminiStar.renderHTML({templatePath, templateArgs: locals});
            } else {
                if(v.htmlPath){
                    html = readFileSync(v.htmlPath).toString()
                } else {
                    if(v.rawHtml){
                        html = v.rawHtml
                    }
                }
            }
        }
        return html;
    }

    private static async addStylesToHtml(html:string, styles:entityStyle):Promise<string>{
        try {
            const dom = new jsdom.JSDOM(html);
            const head = dom.window.document.querySelector("head")
            const htmlEl = dom.window.document.querySelector("html")
            const e = dom.window.document.createElement
            if(styles.cssPath){
                const l = e('link')
                l.setAttribute('rel', 'stylesheet')
                l.setAttribute('href', styles.cssPath)
                if(head)
                    head.appendChild(l);
                else if(htmlEl)
                    htmlEl.appendChild(l)
            }
            if(styles.rawCSS){
                const s = e('style')
                s.innerText = styles.rawCSS;
                if(head)
                    head.appendChild(s);
                else if(htmlEl)
                    htmlEl.appendChild(s)
            }
            const firstEl = dom.window.document.querySelector("*")
            if(firstEl)
                html = firstEl.outerHTML;
        } catch(ex){
            if(styles.cssPath){
                // If we can't parse the DOM, throw a tag at the top and hope
                html = `<link rel="stylesheet" href="${styles.cssPath}">\n` + html
            }
            if(styles.rawCSS){
                // If we can't parse the DOM, throw a tag at the bottom and hope
                html += `<style>\n${styles.rawCSS}\n</style>`
            }
        }
        return html;
    }

    

    private async makeHtml(args:IMakeHtmlArgs):Promise<string>{
        const opts = this.opts;
        const {name, locals, entity} = args
        const templateDir = opts.templateDir || __dirname + '/templates';
        let templatePath = templateDir + `/${name}.pug`;
        let html:string;
        // let html = await AdminiStar.renderHTML({templatePath, templateArgs: locals});
        let v:entityView = {templatePath};
        let s:entityStyle = {};

        if(
            name &&
            entity &&
            entity.name &&
            opts &&
            opts.entitySpecific &&
            opts.entitySpecific[entity.name] && 
            opts.entitySpecific[entity.name].views
        ){
            const o = opts.entitySpecific[entity.name].views
            if(o && o[name]){
                v=o[name]
            } else if(opts.views && opts.views[name]) {
                v = opts.views[name];
            }
        } else if(opts.views && opts.views[name]){
            v = opts.views[name];
        }
        html = await AdminiStar.makeHtmlFromOpts(v, locals)
    
        if(opts.styles){
            if(opts.styles[entity.name] && opts.styles[entity.name][name]){
                const s = opts.styles[entity.name][name];
            }
        }
        html = await AdminiStar.addStylesToHtml(html, s)
        return html;
    }
    public  async bindRoute(args:{
        entity: typeof test,
        path: string,
        type: NativeRoutes,
        editableColumns?: string[],
        visibleColumns?: string[],
        hiddenColumns?: string[],
        protectedColumns?: string[]
    
    }){
        const { 
            entity, 
            path, 
            type, 
            editableColumns, 
            visibleColumns, 
            hiddenColumns, 
            protectedColumns
        } = args
        let route = '';
        const n = express.Router()
        const cols = this.opts.dataSource.getMetadata(entity).columns;
        const columns = cols.map((c)=>{return {name: c.databaseNameWithoutPrefixes, type:c.type}})
        let html = '';
        const locals:{[key:string]: any} = {
            columns, 
            editableColumns: editableColumns || columns, 
            visibleColumns: visibleColumns || columns, 
            hiddenColumns: hiddenColumns || [], 
            protectedColumns: protectedColumns || []
        }

        if(type == 'list'){
            route = path
            n.use(route, async (req, res, next)=>{
                const list = await entity.find()
                locals.list = list
                const html = this.makeHtml({name: 'list', locals, entity})
                    res.send(html)
            })
        } else {
            route = `${path}/:id`;
            n.use(route, async (req, res, next)=>{
                const {id} = req.params
                const e = entity.findOneBy({id:+id})
                locals.entity = e
                const html = this.makeHtml({name: type, locals, entity})
                    res.send(html)
            })
        }
    }

    public async init(
        args?:{
            opts?:optsType
        }
    ){
        const {entities, dataSource} = this;
        await dataSource.initialize()
        const myOpts = args?.opts || {}
        const opts = {
            ...this.opts,
            ...myOpts
        }
        const adminRouter = express.Router()
        for(const entity of entities){
            const r = express.Router()
            let editableColumns;
            if(opts && opts.entities && opts.entities[entity.name] && opts.entities[entity.name].editableColumns)
                editableColumns = opts.entities[entity.name].editableColumns
            let protectedColumns;
            if(opts && opts.entities && opts.entities[entity.name] && opts.entities[entity.name].protectedColumns)
                protectedColumns = opts.entities[entity.name].protectedColumns
            let visibleColumns;
            if(opts && opts.entities && opts.entities[entity.name] && opts.entities[entity.name].visibleColumns)
                visibleColumns = opts.entities[entity.name].visibleColumns
            let hiddenColumns;
            if(opts && opts.entities && opts.entities[entity.name] && opts.entities[entity.name].hiddenColumns)
                hiddenColumns = opts.entities[entity.name].hiddenColumns
            const cols = dataSource.getMetadata(entity).columns;
            const columns = cols.map((c)=>{return {name: c.databaseNameWithoutPrefixes, type:c.type}})

            // human
            r.get('/list', async function (req, res) {
                const list = await entity.find()
                const locals = {
                    list, 
                    columns, 
                    editableColumns: editableColumns || columns, 
                    visibleColumns: visibleColumns || columns, 
                    hiddenColumns: hiddenColumns || [], 
                    protectedColumns: protectedColumns || []
                }
                
                const html = this.makeHtml({name: 'list', locals, opts, entity})
                res.send(html)
            })
    
            r.get('/view/:id', async function (req, res) {
                const { id } = req.params
                const e = await entity.findOneBy({id:+id})

                const locals = {
                    entity:e,
                    columns, 
                    editableColumns: editableColumns || columns, 
                    visibleColumns: visibleColumns || columns, 
                    hiddenColumns: hiddenColumns || [], 
                    protectedColumns: protectedColumns || []
                }
                const html = this.makeHtml({name: 'view', locals, opts, entity})
                res.send(html)
            })
    
            r.get('/edit/:id', async function (req, res) {
                const { id } = req.params
                const e = await entity.findOneBy({id:+id})
                const locals = {
                    entity:e,
                    columns, 
                    editableColumns: editableColumns || columns, 
                    visibleColumns: visibleColumns || columns, 
                    hiddenColumns: hiddenColumns || [], 
                    protectedColumns: protectedColumns || []
                }
                const html = this.makeHtml({name: 'edit', locals, opts, entity})
                res.send(html)
            })
    
            // machine
            r.get('/:id', async function (req, res) {
                const { id } = req.params
                return await entity.findOneBy({id:+id})
            })
            r.get('/', async function (req, res) {
                return await entity.find()
            })
            r.post('/', async function (req, res) {
                const e = new entity()
                const n = req.body;
                for(const k of n){
                    e[k] = n[k];
                }
                try {
                    await e.save()
                    return e;
                } catch (ex) {
                    console.log(ex)
                    return ex
                }
                
            })
            r.put('/:id', async function (req, res, next) {
                const { id } = req.params
                const e = await entity.findOneBy({id:+id})
                if(!e){
                    res.sendStatus(404)
                    return next()
                }
                const n = req.body;
                for(const k of n){
                    e[k] = n[k];
                }
                try {
                    await e.save()
                    return e;
                } catch (ex) {
                    console.log(ex)
                    return ex
                }
            })
            r.delete('/:id', async function (req, res, next) {
                const { id } = req.params
                const e = await entity.findOneBy({id:+id})
                if(!e){
                    res.sendStatus(404)
                    return next()
                }
                await e.remove()
            })
    
            // Support additional custom routes
            if(opts.routes){
                if(opts.routes[entity.name]){
                    for(const path in opts.routes[entity.name]){
                        const route = opts.routes[entity.name][path]
                        for(const verb in route){
                            const allowed_verbs = ['put', 'post', 'get', 'delete']
                            if(allowed_verbs.includes(verb))
                                r[verb](path, route[verb])
                            else
                                throw new Error(verb+ ' not supported')
                        }
                    }
                }
            }
            adminRouter.use(`/${entity.name}`, r)
        }
        this.router = adminRouter;
        return adminRouter
    }

    public bind(externalRouter: express.Router, middleWare?:express.Router){
        if(middleWare){
            externalRouter.use('/admin', middleWare, this.router)
        }
        externalRouter.use('/admin', (req:AdminRequest, res, next)=>{
            if(req.user && req.user.administrator){
                next()
            } else {
                res.sendStatus(401)
            }
        }, this.router)
    }
}

