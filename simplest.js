const hljs = require('highlight.js'); // https://highlightjs.org/
const md = require('markdown-it')({
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return '<pre class="hljs"><code>' +
                    hljs.highlight(lang, str, true).value +
                    '</code></pre>';
            } catch (__) {
            }
        }
        return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
    }
});

const minifyHtml = function (html) {
    return require('html-minifier').minify(html, {
        collapseBooleanAttributes: true,
        decodeEntities: true,
        removeOptionalTags: true,
        removeAttributeQuotes: true,
        removeTagWhitespace: true,
        removeStyleLinkTypeAttributes: true,
        removeScriptTypeAttributes: true,
        removeComments:true,
        minifyCss: true,
        minifyJs: true,
        minifyURLs: true
    });
}




/// the above code will move out

/**
 *  fileNme: _site/OOP.md
 *  saveFileName: _site/OOP-20201128.html
 * @param post
 */
const getSaveFileName = function (post,isUserData){
    if(!post["saveFileName"]){
        const path = require('path')
        if(isUserData){
            post["saveFileName"] = path.dirname(post.fileName.toString()) + path.sep +post.title.replace(/[\s]+/g, "_") + "-" + post.date + ".html"
        }else{
            post["saveFileName"] = post.fileName
        }
    }
}

const interceptionObject = {
    componentFunctions:{
        map: function (templateData, UserData, done) {
            UserData.map(function (post) {
                const result = Object.assign(objectClone(templateData), {data: post});
                done(result)
            })
        },
        reduce: function (templateData, UserData, done) {
            const result = Object.assign(templateData, {data: UserData})
            done(result)
        }
    },
    systemFunctions:{
        beforeFirstRender:function(templateData,UserData){

        },
        beforeSecondRender:function(templateData,UserData){

        },
        onLoadFile:function (file,data){
            if(file.endsWith("md")){
                data.content = md.render(data.content)
            }
        },
        onWriteFile:function (input){
            input.str = minifyHtml(input.str);
        }
    }
}


///////////////////////////////////////////////////////////////

const matter = require('gray-matter');
const fs = require('fs');
const include = require('./include.js');
const mustache = require('mustache');
mustache.escape = function (text) {
    return text;
}


const makeModulePath = function (currentPath) {
    return require.main.path + require("path").sep + currentPath;
}
const sep = require("path").sep
const copyTo = function (file) {
    const newFile = this + sep + file.substr(file.indexOf(sep) + 1)
    fs.mkdirSync(makeModulePath(require('path').dirname(newFile)), {recursive: true})
    fs.copyFileSync(makeModulePath(file), makeModulePath(newFile));
    return newFile;
}
const getFiles = function (file, result) {
    result = result || [];
    const stats = require('fs').statSync(makeModulePath(file));
    if (stats.isFile()) {
        result.push(new String(file))
    } else if (stats.isDirectory()) {
        require('fs').readdirSync(makeModulePath(file)).forEach(function (f) {
            if (!f.startsWith("."))
                getFiles(file + sep + f, result)
        })
    }
    return result;
}
const filterPages = function (value) {
    return (value["type"] && value["type"] === "page")
}
const filterPosts = function (value) {
    const isHtmlOrMd = value.fileName.endsWith("html") || value.fileName.endsWith("md")
    const isPost = !value["type"] || value["type"].toString().trim() !== "post"
    return (isHtmlOrMd && isPost)
}
const notHtmlFilter = function (value) {
    const isHtmlOrMd = value.endsWith("html") || value.endsWith("md")
    return !isHtmlOrMd;
}


const organizeMatterData = function (filePath,data,isUserData){
    data.data['fileName'] = filePath.toString()
    getSaveFileName(data.data,isUserData.valueOf())
    if(isUserData.valueOf()){//posts
        data.data['date'] = data['date'] || new Date().toLocaleDateString()
        data.data['title'] =  data['title'] || data.content.substr(0,10);
        interceptionObject.systemFunctions.onLoadFile(filePath,data);
    }else{//component
        //todo
    }
    return data;
}

/**
 * load files and transform a file to Json, return the data of file
 * @param filePath
 * @returns {{fileName: *, content: string} & {[p: string]: any}}
 */
const getDataFromFile = function (filePath) {
    const isUserData = this
    if (filePath.endsWith(".html") || filePath.endsWith(".md")) {
        let file = fs.readFileSync(makeModulePath(filePath), 'utf8');
        if (!file) {
            console.log("read file fail")
        }
        let result0 = matter(file);
        result0 = organizeMatterData(filePath,result0,isUserData) || result0;
        // const result1 = matter(result0.content);
        const result = {
            content: result0.content,
            fileName: filePath,
        }
        return Object.assign(result, result0.data)
    } else {
        return {
            content: "",
            fileName: filePath,
        }
    }
}

/**
 * save a file
 * @param path
 * @param str
 */
const saveFile = function (path, str) {
    const input = {path:path,str:str}
    interceptionObject.systemFunctions['onWriteFile'](input);
    fs.mkdirSync(makeModulePath(require('path').dirname(input.path)), {recursive: true})
    fs.writeFile(makeModulePath(input.path), input.str, function (err) {
        if (err) {
            return console.log(err);
        }
        console.log(`=> ${path} was saved!`);
    });
}


const generateFiles = function (newDir, path, fileStr) {
    const newFile = newDir + sep + path.substr(path.indexOf(sep) + 1)
    saveFile(newFile, fileStr)
}

const generatePage = function (template, view, outputDir) {
    const result = mustache.render(template, view, {}, ['<%', '%>']);
    //console.log("render pages with frontMatter and pages data\t\t\t")
    view['saveFileName'] = view['saveFileName'] || view['fileName']
    generateFiles(outputDir, view['saveFileName'], result)
}

const objectClone = function (object) {
    return JSON.parse(JSON.stringify(object))
}

const runComponentFunctions = function (templateData, UserData, callback){
    let fns = []
    let interception = templateData["interception"]
    if(interception === undefined){
        fns.push(interceptionObject.componentFunctions["reduce"])
    }else if(interception instanceof Array){
        fns = interception.map(function (name){
            return interceptionObject.componentFunctions[name]
        });
    }else{
        fns.push(interceptionObject.componentFunctions[interception])
    }
    const lastFn = fns.pop();
    fns.forEach(function (fn){
        fn(templateData, UserData, undefined)
    })
    lastFn(templateData, UserData,callback)
}

const process = function (pages, posts, output) {
    pages.forEach(function (page) {
        //console.log("process:\t" + page.fileName)
        include.load(page.fileName.toString()).addListener(include.event.BeforeRequest, function (tag) {
            tag.attribute.originalSrc = tag.attribute.src
            tag.attribute.src = makeModulePath(tag.attribute.src);
        }).addListener(include.event.AfterRequest, function (node) {
            //render first frontMatter0
            //console.log("AfterLoaded\t\t\t" + JSON.stringify(node.tag.attribute))
            const matterData = matter(node.tag.content)
            const tempPage = matterData.content;
            const templateData = Object.assign({fileName:node.tag.attribute.originalSrc},matterData.data);
            const UserData = posts
            let callback = function (result) {
                //console.log("First Render")
                //console.log("tempPage:\t" + tempPage)
                //console.log("templateData:\t" + JSON.stringify(templateData))
                node.tag.content = mustache.render(tempPage, result, {}, ['{{', '}}']);
            }
            interceptionObject.systemFunctions.beforeFirstRender(templateData,UserData)
            runComponentFunctions(objectClone(templateData), objectClone(UserData), callback);
        }).addListener(include.event.ToString, function (data) {
            if (data.node.isRoot) {
                //render templates to build the final templates
                const matterData = matter(data.doc)
                const tempPage = matterData.content;
                const templateData = Object.assign({fileName:data.node.tag.attribute.originalSrc},matterData.data);
                const UserData = posts
                let callback = data.node.parent ? function (view) {
                    data.doc = mustache.render(tempPage, view, {}, ['<%', '%>']); //components templates
                } : function (view) {
                    generatePage(tempPage, view, output) //page templates
                }
                //console.log("Second Render")
                //console.log("tempPage:\t" + tempPage)
                //console.log("templateData:\t" + JSON.stringify(templateData))
                //export interfaces
                interceptionObject.systemFunctions.beforeSecondRender(templateData,UserData)
                runComponentFunctions(objectClone(templateData), objectClone(UserData), callback);
            }
        }).addListener(include.event.AfterCompletelyLoaded, function (node) {

        }).done(function (root) {
            //console.log("Done")
        });
    })
}


exports.load = function (themePath) {
    const pages = getFiles(themePath).map(getDataFromFile,false).filter(filterPages);
    const exportObject = {
        addComponentFunction: function (name, fn) {
            interceptionObject.componentFunctions[name] = fn;
            return this
        },
        addSystemFunction:function (name, fn) {
            interceptionObject.systemFunctions[name] = fn;
            return this
        },
        render: function (userDataPath, output) {
            fs.rmdirSync(output,{recursive:true})
            getFiles(themePath).filter(notHtmlFilter).map(copyTo, output);
            const posts = getFiles(userDataPath).map(copyTo, output).map(getDataFromFile,true).filter(filterPosts);
            process(pages, posts, output)
        },
        export: function () {
            exports.render = function (userDataPath, output) {
                exportObject.render(userDataPath, output)
            }
        }
    }
    return exportObject;
}






















