import { extent,
         select, 
         selectAll,
         scale } from 'd3';


import { buildPhylogram,
         draw_scale} from './phylogram';
import { toBlob } from './dom-to-image.js';
import { saveAs } from 'file-saver';
import { atext,
         draw_circle,
         draw_rect,
         acheckbox} from './render-html';
import { clean_string, shuffle } from './helpers';
import { create_popper } from './popper';
import { Margin,
         ParamSet,
         OptionSet,
         NSide,
         Notation,
         Gene,
         Rect,
         //Circle,
         Field,
         TreeNode } from './interfaces';


export function get_levels(data : {[index : string] : Gene}, 
                           notation : string) {
    var levels = new Set();
      (<any>Object).entries(data).forEach(([gene, d] : [string, Gene]) => {
          if (gene != "NA") {
              (<any>Object).values(d.neighbourhood).forEach((neigh : Gene)=> {
                  try{
                      (<any>Object).keys(neigh[notation]).forEach(
                          (l : number|string) => {
                          if (l != "scores") {
                              levels.add(l)
                          }
                        })
                  } catch {}
              })
          }
      })
    return levels;
}

/**
 * Return dictionary with unique functional data and description
 * @function get_unique_functions
 * @param {JSON object} data: genomic context information as JSON object
 * @param {string} notation: string defining name of field in JSON data
 *                           with which to color genomic context
 * @param {string} taxlevel: when dealing with eggNOG functional data.
 *                           Specifies taxonomic level at which to read
 *                           eggNOG information. Default: 2 (Bacteria)
 * @param {number} nside: integer defining number of genes upstream and
 *                        downstream of central gene to be displayed
 */
function get_unique_functions(data : {[index:string] : Gene}, 
                                    notation : string, 
                                    taxlevel : (number|string), 
                                    nside: NSide) : object {
    var unique : {[index: string] : string} = {};
    (<any>Object).values(data).forEach((d : Gene) => {
      (<any>Object).entries(d.neighbourhood).forEach(([pos, n] : 
                                            [number|string, Gene]) => {
          if (Number(pos) <= nside.downstream && Number(pos) >= -nside.upstream){
                  if (notation == "eggNOG" || 
                      notation == "tax_prediction"){
                      (<any>Object).entries(n[notation]).forEach(([l, d] :
                                                [number|string, Notation]) => {
                          if (l != "scores" && d) {
                              if (l == taxlevel) {
                                (<any>Object).entries(d).forEach(([id,d] : 
                                                    [string, Notation]) => {
                                    unique[id] = d.description
                                });
                              } else if (taxlevel == "") {
                                (<any>Object).values(d).forEach(
                                    (v : Notation) => 
                                    unique[v.id] = v.description);
                              }
                          }
                      })
                  } else {
                      if (typeof n[notation] === "object") {
                          (<any>Object).entries(n[notation]).forEach(([k,d] :
                                                [number|string, Notation]) => {
                              if (k != "scores" && k != "prediction") {
                                let description = d.description || "";
                                unique[k] = description;
                              }
                            })
                      } else {
                          if(n[notation]) {
                              unique[n[notation]] = "";
                          }
                      }
                  }
              }
      })
    })
    try { delete unique[""] } catch {}
    try { delete unique["NA"] } catch {}
    return unique;
}


/**
 * Draw phylogenectic tree in Newick format using newick.js & d3.phylogram.js
 * @function draw_newick
 * @param {string} file: path to file containing tree
 * @param {number} nleaf: number of leaves. Used for scaling
 */
async function draw_newick(selector : string,
                           newick : TreeNode,
                           nfield : number,
                           nleaf : number,
                           name_fields? : string[]) {

    var newickNodes = [];
    function buildNewickNodes(node : TreeNode) {
      newickNodes.push(node);
      if (node.branchset) {
        for (var i=0; i < node.branchset.length; i++) {
          buildNewickNodes(node.branchset[i]);
        }
      }
    }
    buildNewickNodes(newick);

    buildPhylogram(selector + ' div#phylogram', newick, {
      width: 100,
      height: nleaf * nfield * 18,
      name_fields: name_fields,
    });
  };


/**
 * Draw legend based on unique functional data
 * @function draw_legend
 * @param {object} unique_functions: dictionary with unique functional data and description
 * @param {scaleOrdinal} palette: color palette associated to unique_functions keys
 * @param {string} notation: string defining name of field in JSON data
 *                           with which to color genomic context
 */
function draw_legend(selector : string,
                    div_id : string,
                    title : string,
                    unique_functions : object, 
                    palette : scale.ordinal, 
                    notation : string) : void{

    var d3viz : d3.Selection<HTMLElement> = select(selector);
    if (notation == "GMGFam"){
        var factor = 30;
    } else {
        var factor = 40;
    }
    var legend = d3viz.select("div#" + div_id);
    var legend_h = (<any>Object).keys(unique_functions).length * factor;
    legend.style("width", "100%");
    legend.style("height", Math.min(window.innerHeight - 50, legend_h + 100) + "px");
    legend.append("div")
                    .style("outline", "none")
                    .style("display", "block")
                    .style("width", "400px")
                    .style("text-align", "center")
                    .style("padding-bottom", "10px")
                    .style("margin", "0 auto")
                    .style("font-weight", "bold")
                    .html(title);
    acheckbox(legend.append("div")
                    .attr("class", "pl-3")
                    .style("display", "flex"), 
              "Select all", 
              undefined, 
              div_id + "-legend-openAll",
              false)
    let legend_switch = $(selector + " #" + div_id + "-legend-openAll");
    legend_switch.change(() => {
        let switches = $(selector + " .legend-switch");
        if (legend_switch.is(":checked")) {
            switches.prop("checked", true);
        } else {
            switches.prop("checked", false);
        }
        switches.trigger("change");
    })
    let nodata = legend.append("div")
                    .style("outline", "none")
                    .style("display", "flex");
    let nodata_svg = nodata.append("svg")
       .attr("width", 40)
       .attr("height", 40)
       .style("display", "inline-block");
    draw_circle(nodata_svg,
                6,
                20,
                6.5,
                "var(--nodata)");
    nodata.append("div")
       .style("display", "inline-block")
       .style("outline", "none")
       .html("No data");

    (<any>Object).entries(unique_functions).forEach(([id, f] : [string, string]) => {
        let div = legend.append("div")
                        .attr("id", "id" + clean_string(id))
                        .style("outline", "none")
                        .style("display", "flex");
        div.append("svg")
           .attr("width", 40)
           .attr("height", 40)
           .style("display", "inline-block")
           .style("margin-top", "6px")
            .append("circle")
         .attr("r", 6)
         .attr("cx", 20)
         .attr("cy", 6.5)
         .style("fill", palette(id));
      var t = div.append("div")
           .style("display", "inline-block")
           .style("outline", "none");
     var title : string = "<em>" + id + "</em>";
     if (notation == 'KEGG') {
        title = '<a href=" \
                https://www.kegg.jp/dbget-bin/www_bget?map' +
                id + '" target="_blank" style="outline:none;">'+id+'</a>';

     } 
     acheckbox(t, title, "legend-switch", "c" + clean_string(id), false);
     var cb = $(selector + " #c" + clean_string(id));
     cb.change(() => {
        if (cb.is(":checked")) {
            d3viz.selectAll(".c" + clean_string(id)).attr("fill", palette(id));
        } else {
            d3viz.selectAll(".c" + clean_string(id)).attr("fill", "var(--nodata)");
        }
    })
     t.append("div")
      .attr("class", "w-100")
      .style("display", "block")
      .style("max-height", "35px")
      .html(f);
    })
}


/**
 * Create button for downloading graph embedded in div_id div
 * @function create_download_button
 * @param {string} div_id: id of div which will contain the graph.
 *                         Default: "graph" <div id="graph"></div>
 */
export function create_download_button(selector : string,
                                       btn_id : string, 
                                       filename : string,
                                       div_selector?: string,
                                       data? : JSON, 
                                       url? : string,
                                       txt? : string) : void {
    const viz : HTMLElement = document.querySelector(selector);
    const d3viz: d3.Selection<HTMLElement> = select(selector);
    var btn = viz.querySelector("#" + btn_id);

    //var r = document.querySelector(':root');
    //var rs = getComputedStyle(r);
    //var sand : string = String(rs.getPropertyValue('--sand'));

   if (div_selector) {
        btn.onclick = function() {
            var graph = viz.querySelector(div_selector);
            d3viz.select(div_selector + "::-webkit-scrollbar")
                .style("display", "none");
            // Change background color
            //select(':root').style('--sand', 'white');
            toBlob(graph , undefined)
                .then(function (blob : Blob) {
                    saveAs(blob, filename);
        });
            // Reset css
            d3viz.select(div_selector + "::-webkit-scrollbar")
                .style("display", "initial");
            //select(':root').style('--sand', sand);
        }
   } else if (data) {
       btn.onclick = function () {
           var blob = new Blob([JSON.stringify(data)], {
                         type: "application/json"
                        });
           saveAs(blob, filename);
       }
   } else if (txt) {
       btn.onclick = function () {
           var blob = new Blob([String(txt)], {
                         type: "plain/txt"
                        });
           saveAs(blob, filename);
       }
   } else if (url) {
       btn.onclick = async function () {
            var file = await $.ajax({
              url: url,
              error: function() {
                  console.log("No tree found")
              }
            })
           var blob = new Blob([JSON.stringify(file)], {
                         type: "application/json"
                        });
           saveAs(blob, filename);
       }
   }
}


/**
 * Retrieve "identifier data" which will be used to color the different genes
 * Return dictionary
 * @function get_identifiers
 * @param {object} neigh: gene information of neighbor/central gene
 * @param {string} notation: string defining name of field in JSON data
 *                           with which to color genomic context
 * @param {string} taxlevel: when dealing with eggNOG functional data.
 *                           Specifies taxonomic level at which to read
 *                           eggNOG information. Default: 2 (Bacteria)
 */
function get_identifiers(neigh : Gene, 
                         notation : string, 
                         taxlevel : (number|string)
                        ): object {

    var identifiers : {[index : string] : Notation} | Notation = {};
    try {
        if (notation == "eggNOG"){
            if(taxlevel != "") {
                identifiers = {...neigh[notation][taxlevel]};
            } else {
                (<any>Object).values(neigh[notation]).forEach(
                                (l : number|string) => {
                    if (l != "scores") {
                        (<any>Object).values(l).forEach((egg : Notation) => {
                            identifiers[egg.id] = egg.description;
                        })
                    }
                })
            }
        } else if(typeof neigh[notation] === "object") {
            identifiers = {...neigh[notation]};
            try {
                delete identifiers['scores'];
                delete identifiers['prediction'];
            } catch {}
        } else {
            identifiers[neigh[notation]] = "";
        }
    } catch {};

    return identifiers;
}


/**
 * Returns ordinate (y-axis) of gene based on relative position of central
 * gene in phylogenetic tree if drawn
 * Alternatively returns ordinate based on graph dimensions
 * @function get_ordinate
 * @param {string} gene: central gene gene
 * @param {number} counter: unique identifier
 * @param {object} rect: gene representation dimensions
 */
function get_ordinate(viz : HTMLElement,
                      gene : string, 
                      central_pos : number, 
                      rect : Rect,
                      nfield : number,
                     ) : number{
    let id = "g#g" + clean_string(gene);
    try {
        let top = viz.querySelector(id).getBoundingClientRect().top -
                  viz.querySelector("#phylogram").getBoundingClientRect().top;
        return top-6;
    } catch {
        return 13 + rect.pv + central_pos * (rect.h*nfield + rect.pv - 5)
    }
}


/**
 * Reset potential previous graph in same div#<div_id> to guarantee
 * expected graphication
 * @function erase_graph
 * @param {string} div_id: id of div which will contain the graph.
 *                         Default: "graph" <div id="graph"></div>
 * @param {boolean} full_reset: Full reset of select box options
 */
export function erase_graph(selector : string, div_id : string, full_reset : boolean) : void {
      const viz : HTMLElement = document.querySelector(selector);
      const d3viz: d3.Selection<HTMLElement> = select(selector);
      // Remove required tags
      d3viz.selectAll("div.required").html("");
      // Remove previous poppers if any
      d3viz.selectAll(".popper").remove();
      // Remove previously computed graph
      d3viz.select("svg#synteny").remove();
      d3viz.selectAll("svg.scale").remove();
      d3viz.select("svg#phylogram").remove();
      d3viz.select("div#download-btns").style("visibility", "hidden")
                              .style("opacity", 0);
      d3viz.select("div#" + div_id)
            .style("visibility", "hidden")
            .style("opacity", 0);
      var legend = viz.querySelector("div#legend");
      while(legend.lastChild) { legend.lastChild.remove(); }
    if (full_reset){
      try {
        // If there were custom select boxes we must reset previously selected
        // parameters
        var nUpstream = d3viz.select("select#nUpstream");
        nUpstream.selectAll("*").remove();
        nUpstream.append("option")
             .attr("value", 10)
             .attr("disabled", "")
             .attr("selected", "")
             .html("Genes upstream");
        var nDownstream = d3viz.select("select#nDownstream");
        nDownstream.selectAll("*").remove();
        nDownstream.append("option")
             .attr("value", 10)
             .attr("disabled", "")
             .attr("selected", "")
             .html("Genes downstream");
        var tlevel = d3viz.select("select#tax-rank");
        tlevel.selectAll("*").remove();
        tlevel.append("option")
             .attr("value", "superkingdom")
             .attr("disabled", "")
             .attr("selected", "")
             .html("Taxonomic rank");
        var enot = d3viz.select("select#notation");
        enot.selectAll("*").remove();
        enot.append("option")
            .attr("value", "KEGG")
            .attr("disabled", "")
            .attr("selected", "")
            .html("KEGG");
        enot.append("option")
            .attr("value", "code")
            .html("Preferred name");
        enot.append("option")
            .attr("value", "KEGG")
            .html("KEGG");
        enot.append("option")
            .attr("value", "eggNOG")
            .html("eggNOG");
        enot.append("option")
            .attr("value", "GMGFam")
            .html("GMGFam");
        var ephy = d3viz.select("select#egg-level");
        ephy.attr("disabled", "");
        ephy.selectAll("*").remove();
        ephy.append("option")
            .attr("value", "")
            .attr("disabled", "")
            .attr("selected", "")
            .html("eggNOG tax-level");

        // Remove previously created custom select boxes for re-rendering
        var select_boxes = viz.querySelectorAll("div.select-selected");
        select_boxes.forEach(box => box.remove());
        var select_options = viz.querySelectorAll("div.select-items");
        select_options.forEach(opt => opt.remove());
      } catch(e){}
      d3viz.select("div#submit-params")
            .style("visibility", "hidden")
            .style("opacity", 0);
    }
}


/**
 */
function get_arrow(rect : Rect, 
                   r : Rect,
                   x0 : number,
                   ordinate: number,
                   strand : "+"|"-") {

    if (strand == "-" || +strand < 0) {
        var path : string = [
        "M",
        x0 + 1,
        " ",
        ordinate - .8,
        " ",
        "L",
        x0 + - 2*rect.ph / 5,
        " ",
        ordinate + (rect.h - rect.pv) / 2,
        " ",
        "L",
        x0 + 1,
        " ",
        ordinate + rect.h - rect.pv + .8,
        " ",
        "Z",
      ].join("");

      var stroke_path : string = [
        "M",
        x0,
        " ",
        ordinate,
        " ",
        "L",
        x0 - 2*rect.ph / 5,
        " ",
        ordinate + (rect.h - rect.pv) / 2,
        " ",
        "L",
        x0,
        " ",
        ordinate + rect.h - rect.pv,
        " ",
        "L",
        x0 + r.w - rect.ph,
        " ",
        ordinate + rect.h - rect.pv,
        " ",
        "L",
        x0 + r.w - rect.ph,
        " ",
        ordinate,
        " ",
        "Z",
      ].join("");
    }

    else {
      var path : string = [
        "M",
        x0 + r.w - rect.ph - 1,
        " ",
        ordinate - .8,
        " ",
        "L",
        x0 + r.w - rect.ph + 2*rect.ph / 5,
        " ",
        ordinate + (rect.h - rect.pv) / 2,
        " ",
        "L",
        x0 + r.w - rect.ph - 1,
        " ",
        ordinate + rect.h - rect.pv + .8,
        " ",
        "Z",
      ].join("");

      var stroke_path : string = [
        "M",
        x0 + r.w - rect.ph,
        " ",
        ordinate,
        " ",
        "L",
        x0 + r.w - rect.ph + 2*rect.ph / 5,
        " ",
        ordinate + (rect.h - rect.pv) / 2,
        " ",
        "L",
        x0 + r.w - rect.ph,
        " ",
        ordinate + rect.h - rect.pv,
        " ",
        "L",
        x0,
        " ",
        ordinate + rect.h - rect.pv,
        " ",
        "L",
        x0,
        " ",
        ordinate,
        "Z",
      ].join(""); 
    }

    return {path : path, stroke_path : stroke_path};
}


function legend_listeners(selector : string,
                        notation : string,
                        ids : string[],
                        highlight : "stroke" | "circle") {

    const viz : HTMLElement = document.querySelector(selector);
    const d3viz: d3.Selection<HTMLElement> = select(selector);
    var mouseover = function () {
        ids.forEach((i : string) => {
            if (i != "") {
                if (notation == "KEGG") {
                    var legend_name = viz.querySelectorAll("div#id"+
                                        clean_string(i)+">div>label>span>a");
                } else {
                    var legend_name = viz.querySelectorAll("div#id"+
                                        clean_string(i)+">div>label>span>em");
                }

                legend_name.forEach(l => {
                    l.setAttribute("style",
                        "color: var(--highlight);\
                        transition: color 0.3s")
                })
            }
        });
    };
      var mouseleave = function () {
        ids.forEach((i : string) => {
            if (i != "") {
                if (notation == "KEGG") {
                    var legend_name = viz.querySelectorAll("div#id"+
                                        clean_string(i)+">div>label>span>a");
                } else {
                    var legend_name = viz.querySelectorAll("div#id"+
                                        clean_string(i)+">div>label>span>em");
                }

                legend_name.forEach(l => {
                    l.setAttribute("style",
                        "color: default;\
                        transition: color 0.3s")
                })
        }});
    };

    // Legend event listeners
    ids.forEach((i : string) => {
        if (i != "") {
            viz.querySelectorAll("div#id"+clean_string(i))
                .forEach(d => {
                    var t = d.querySelector("em")
                    if (notation == "KEGG") {
                        t = d.querySelector("a");
                    }
                    d.addEventListener("mouseover", () => {
                        if (highlight == "stroke") {
                            d3viz.selectAll("path.stroke." + d.getAttribute("id"))
                                    .style("opacity", 1);
                        } else if (highlight == "circle") {
                            d3viz.selectAll("circle#" + d.getAttribute("id"))
                                    .style("stroke", "black")
                                    .style("stroke-width", "2px");
                        }
                        t.setAttribute("style", "color: var(--highlight);");
                    });
                    d.addEventListener("mouseleave", () => {
                        if (highlight == "stroke") {
                            d3viz.selectAll("path.stroke." + d.getAttribute("id"))
                                    .style("opacity", 0);
                        } else if (highlight == "circle") {
                            d3viz.selectAll("circle#" + d.getAttribute("id"))
                                    .style("stroke", "none");
                        }
                        t.setAttribute("style", "color: default");
                    })
                })}});
    return { mouseover, mouseleave };
}



function draw_genomic_path(g : d3.Selection<SVGElement>,
                               width : number, 
                               ordinate : number,
                               y : number, 
                               rect : Rect,
                               margin : Margin) {

    let genPos_path = g.append("path")
                    .attr("class", "genPos-path")
                    .attr("d",
                            "M " + (- rect.ph/2) + " " +
                                    (ordinate + rect.h*(y+1) - rect.h*3/4) + " " +
                            "L " + (width - margin.right - rect.ph/2) + " " +
                                    (ordinate + rect.h*(y+1)  - rect.h*3/4)
                         )
                    .style("fill", "none")
                    .style("stroke", "#5d5d5d")
                    .style("stroke-width", "1.5px")
                    .style("position", "relative")
                    .style("z-index", 3);
    return genPos_path;
}

/**
 * Hover rationale for gene rects
 * @function gene_hover
 * @param {string[]} ids
 */

function gene_hover(selector: string,
                    central_gene : string, 
                    notation : string,
                    nside : number,
                    abcissa : number,
                    ids : string[],
                    gene_path : d3.Selection<HTMLElement>,
                    rectangles : any[], 
                    text : any,
                    arrow : any){

    const d3viz: d3.Selection<HTMLElement> = select(selector);

    var { mouseover, mouseleave } = legend_listeners(selector, notation, ids, "stroke");
    // Stroke rationale
    var over_gene = function () {
        d3viz.select("path#" + select(this).attr("id") + ".stroke")
          .style("opacity", 1);
        d3viz.select("text#" + select(this).attr("id") + ".notation")
          .style("fill", "var(--black)");
        var leaf = d3viz.select("g#g" + clean_string(central_gene));
        leaf.select("circle")
          .style("stroke", "var(--highlight)")
          .style("fill", "var(--highlight)")
          .style("transition", "stroke 0.3s, fill 0.3s");
        leaf.select("text")
            .style("fill", "var(--highlight)")
            .style("transition", "fill 0.3s");
        if (abcissa == nside) {
            gene_path.style("visibility", "visible").style("opacity", 1);
        }
        mouseover();
    };
      var leave_gene = function () {
        d3viz.select("path#" + select(this).attr("id") + ".stroke")
         .style("opacity", 0);
        d3viz.select("text#" + select(this).attr("id") + ".notation")
          .style("fill", "var(--sand)");
        var leaf = d3viz.select("g#g" + clean_string(central_gene));
        leaf.select("circle")
          .style("stroke", "var(--dark-purple)")
          .style("fill", "var(--purple)")
          .style("transition", "stroke 0.3s, fill 0.3s");
        leaf.select("text")
            .style("fill", "var(--dark-gray)")
            .style("transition", "fill 0.3s");
        if (abcissa == nside) {
            gene_path.style("visibility", "hidden").style("opacity", 0);
        }
        mouseleave();
    };
    // Add mouse calls
    rectangles.forEach((r : any) =>
      r.on("mouseover", over_gene)
       .on("mouseleave", leave_gene));

    text
      .on("mouseover", over_gene)
      .on("mouseleave", leave_gene);

    arrow
      .on("mouseover", over_gene)
      .on("mouseleave", leave_gene);
}


function tree_hover(selector : string, 
                    central_gene : string,
                    gene_path : d3.Selection<HTMLElement>) {

    const viz : HTMLElement = document.querySelector(selector);
    const d3viz: d3.Selection<HTMLElement> = select(selector);
    var gene_leaf : 
        d3.Selection<HTMLElement> = d3viz.select("g#g" + clean_string(central_gene));
    if (gene_leaf){
        let highlight_uni = function(gene_leaf : d3.Selection<HTMLElement>,
                                     gene_path : d3.Selection<HTMLElement>) {
            gene_leaf.select("circle")
              .style("stroke", "var(--highlight)")
              .style("fill", "var(--highlight)")
              .style("transition", "stroke 0.3s")
              .style("transition", "fill 0.3s");
            gene_leaf.select("text")
                .style("fill", "var(--highlight)")
                .style("transition", "fill 0.3s");
            gene_path.style("visibility", "visible").style("opacity", 1);

        }
        let hide_uni = function(gene_leaf : d3.Selection<HTMLElement>,
                                gene_path : d3.Selection<HTMLElement>) {
            gene_leaf.select("circle")
              .style("stroke", "var(--dark-purple)")
              .style("fill", "var(--purple)")
              .style("transition", "stroke 0.3s")
              .style("transition", "fill 0.3s");
            gene_leaf.select("text")
                .style("fill", "var(--dark-gray)")
                .style("transition", "fill 0.3s");
            gene_path.style("visibility", "hidden").style("opacity", 0);
        }
        gene_leaf.on("mouseover", () => {
                highlight_uni(gene_leaf, gene_path);
            });
        gene_leaf.on("mouseleave", () => {
                hide_uni(gene_leaf, gene_path);
            })
        var inner_clades : any = viz
                              .querySelectorAll("circle.g" + clean_string(central_gene));
        inner_clades.forEach((clade : HTMLElement) => {
            clade.addEventListener("mouseover", () => {
                clade.setAttribute("stroke", "var(--highlight)");
                clade.setAttribute("fill", "var(--highlight)");
                gene_path.style("visibility", "visible")
                            .style("opacity", 1);
                highlight_uni(gene_leaf, gene_path);
            })
            clade.addEventListener("mouseleave", () => {
                clade.setAttribute("stroke", "var(--dark-gray)");
                clade.setAttribute("fill", "var(--dark-gray)");
                gene_path.style("visibility", "visible")
                            .style("opacity", 0);
                hide_uni(gene_leaf, gene_path);
            })
        })
    }
}


function draw_neighbor(selector : string,
                       g : d3.Selection<HTMLElement>,
                       pos : number,
                       neigh : Gene,
                       d : Gene,
                       nside  : NSide,
                       counter : number,
                       notation : string,
                       taxlevel : number|string,
                       tpred_level : string,
                       ordinate : number,
                       rect : Rect,
                       gene_rect : Rect,
                       sizeScale : scale.linear,
                       fn_palette : scale.ordinal,
                       gene_path : d3.Selection<HTMLElement>,
                       fields : {[index:string]:Field},
                       options : OptionSet,
                       identifier_getter : 
                                    (gene:object, 
                                        notation:string, 
                                        taxlevel:(number|string)
                                    ) => object = get_identifiers,
                       initial_pos? : number)
                        : number {
        // Return value
        var x0 : number;
        var xf : number;
        var abcissa : number = +pos + nside.upstream;
        if (options.scaleSize && neigh.size) {
            gene_rect.w = +sizeScale(+neigh.size);
        } else {
            gene_rect.w = rect.w;
        }
        if (initial_pos) {
            x0 = initial_pos;
            xf = initial_pos;
            if (+pos < 0) { 
                x0 += - gene_rect.w + rect.ph;
                xf = x0 - 2*rect.ph/5;
                if (neigh.strand == "+" || +neigh.strand > 0){
                    x0 -= 2*rect.ph/5;
                }
            } else {
                if (neigh.strand == "-" || +neigh.strand < 0) {
                    x0 += 2*rect.ph / 5;
                    xf = x0 + gene_rect.w - rect.ph;
                } else {
                    xf += gene_rect.w - rect.ph + 2*rect.ph / 5;
                }
            }

        } else {
            x0 = abcissa * rect.w + Math.abs(rect.w/2 - gene_rect.w/2);
            if (neigh.strand == "-" || +neigh.strand < 0) {
                x0 += rect.ph / 5;
            } else {
                x0 -= rect.ph / 5;
            }
        }
        if (pos == 0 && fields.n) {
            let n = d.neighbourhood.n || neigh.n_contig || " ";
            atext(g,
                  n + fields.n.text,
                  nside.upstream * rect.w + rect.w / 2 - rect.ph / 1.4 - 2.5 * (String(n).length-1),
                  ordinate + gene_rect.h / 1.7 + gene_rect.h * fields.n.y);
        }

        // Only render genes present and within nside
        if ((<any>Object).keys(neigh).length > 1 &&
            neigh.gene != "NA"){
            var identifiers = identifier_getter(neigh, notation, taxlevel);

            // Fill
            var arrow_fill : string = "";
            var arrow_class : string = "";
            var identifiers_ks : string[] = [];
            try {
                identifiers_ks = (<any>Object).keys(identifiers);
            } catch {};
            if (identifiers_ks.length != 0 && 
                ["", "NA", "undefined"].every(i => i!=identifiers_ks[0])){
                let ids = identifiers_ks;
                 if (neigh.strand == "-" || +neigh.strand < 0) {
                    arrow_fill = String(fn_palette(ids[0]));
                    arrow_class = ids[0];
                } else { 
                    arrow_fill = String(fn_palette(ids[ids.length-1]));
                    arrow_class = ids[ids.length-1];
                }
            } else {
                arrow_fill = "var(--nodata)";
                identifiers = {"":""}
                identifiers_ks = (<any>Object).keys(identifiers);
            }

            var bar_width = (gene_rect.w - rect.ph) / identifiers_ks.length;
            var rectangles : d3.Selection<SVGRect>[] = [];
            var id_string = "";

            var nrect = 0;
            identifiers_ks.forEach((id : string) => {
                var gene_rect_fill : string = "var(--nodata)";
                var gene_rect_class : string = "";
                if(["", "NA", undefined].every(i => i!=id)){
                    gene_rect_fill = String(fn_palette(id));
                    gene_rect_class = clean_string(id);
                }
                let r = draw_rect(g,
                             x0 + bar_width * nrect,
                             ordinate,
                             bar_width,
                             gene_rect.h - rect.pv,
                             gene_rect_fill,
                             "idx" + counter);
                r.attr("class", "c" + gene_rect_class);
                rectangles.push(r);

                id_string += " id" + clean_string(id);
                nrect++;
            })

            // Arrow shape of gene visualization
            var { path, stroke_path } = get_arrow(rect,
                                                  gene_rect, 
                                                  x0,
                                                  ordinate, 
                                                  neigh.strand)
            var arrow = g
              .append("path")
              .attr("d", path)
              .attr("fill", arrow_fill)
              .style("outline", "none")
              .style("cursor", "pointer")
              .attr("id", "idx" + counter)
              .attr("class", "c" + arrow_class);

            // Add hoverable stroke that sorrounds gene arrow
            let central_gene : string = d.neighbourhood[0].gene
             g.append("path")
              .attr("class", "stroke" + id_string + " ord" + clean_string(central_gene))
              .attr("id", "idx" + counter)
              .attr("d", stroke_path)
              .style("opacity", 0)
              .style("transition", "opacity 0.3s");

            if (pos == 0 && options.highlightAnchor) {
                var anchor_stroke = g.append("path")
                  .attr("class", "anchor-stroke")
                  .attr("d", stroke_path)
                  .style("opacity", 1)

                
                $(selector + " span#highlightAnchor").click(() => {
                    if ($(selector + " input#highlightAnchor").is(":checked")) {
                        anchor_stroke.style("opacity", 1)
                    } else {
                        anchor_stroke.style("opacity", 0)
                    }
                })
            }

            // Prefered name for gene and anchor text for popper
            var text = atext(g,
                             String(counter),
                             x0 + gene_rect.w / 2 - rect.ph / 2,
                             ordinate + gene_rect.h / 1.7,
                             "idx" + counter)
                       .attr("class", "notation")
                       .style("opacity", 0);

            if(options.showName && ["", "NA", undefined].every(i => i!=neigh.code)){
                // Only display when it fits
                //&& gene_rect.w - gene_rect.ph >= 35
                //&& neigh.code.length < 7) {

                // // 6 is size per char
                let size : number = +Math.floor(gene_rect.w / 13.5); 
                let name : string = neigh.code;
                if (size < name.length){
                    name = name.slice(0, size);
                    
                }
                text.text(name)
                    .style('opacity', 1)
                    .style("fill", "var(--sand)");
            }

            // Hover effect over gene representation
            gene_hover(selector,
                        central_gene, 
                        notation,
                        nside.upstream,
                        abcissa,
                        identifiers_ks,
                        gene_path,
                        rectangles,
                        text,
                        arrow);

            Object.entries(fields).forEach(([f, d] : [string, Field]) => {
                try {
                  if (d.rep == "circle") {
                    let id = Object.keys(neigh[f][d.level])[0];
                    let c = draw_circle(g,
                            d.circle.r,
                            x0 + gene_rect.w/2 - rect.ph/2,
                            ordinate + gene_rect.h * d.y + d.circle.r,
                            d.palette(id),
                            "id"+id)
                    let { mouseover, mouseleave } = legend_listeners(selector,
                                                                    f,
                                                                    [id], 
                                                                    d.rep)
                    c.on("mouseover", () => {
                        c.style("stroke", "black")
                         .style("stroke-width", "2px");
                         mouseover();
                     })
                     .on("mouseleave", () => {
                        c.style("stroke", "none");
                         mouseleave();
                     });

                  } else if (f == "showPos" && neigh.start) {
                      let start = neigh.start;
                      let cx = +x0;
                      let tx = +x0;
                      if (neigh.strand == "-" || +neigh.strand < 0){
                          cx += gene_rect.w - rect.ph;
                          tx = cx - 5 * String(start).length;
                      }
                      atext(g,
                          String(start),
                          tx,
                          ordinate + rect.h*(fields.showPos.y+1) - rect.h*1/6)
                      .style("font-size", "0.7em");
                      draw_circle(g,
                                  3,
                                  cx,
                                  ordinate + rect.h*(fields.showPos.y+1) - rect.h*3/4,
                                  "black");
                  }
                } catch {}
            })

            create_popper(selector,
                          pos,
                          neigh,
                          notation,
                          taxlevel,
                          tpred_level,
                          counter);
        }
    return xf;
}



/**
 * Draw genomic context from specified JSON data
 * @function draw_genomic_context
 * @param {string} div_id: id of div which will contain the graph.
 *                         Default: "graph" <div id="graph"></div>
 * @param {JSON object} data: genomic context information as JSON object
 * @param {string} notation: string defining name of field in JSON data
 *                           with which to color genomic context
 * @param {string} taxlevel: when dealing with eggNOG functional data.
 *                           Specifies taxonomic level at which to read
 *                           eggNOG information. Default: 2 (Bacteria)
 * @param {number} nside: integer defining number of genes upstream and
 *                        downstream of central gene to be displayed
 * @param {number} nenv: maximum number of genes in neighbourhood
 *                       (central gene included)
 * @param {number} context_width: width of genomic context graph
 *                                (legend excluded)
 * @param {TreeNode} newick: (optional) phylogenetic tree in Newick format.
 * @param {string[]} colors: array with colors in hex
 * @param {function} identifier_getter: (optional) custom function to retrieve
 *                                      "identifier data" which will be used
 *                                      to color the different genes
 *                                      Params: gene, notation, taxlevel
 */
export async function draw_genomic_context(selector : string,
                                            div_id : string,
                                            data : {[index:string]:Gene},
                                            notation : string,
                                            taxlevel : (number|string),
                                            tpred_level : string,
                                            nside : NSide,
                                            nenv : number,
                                            fields : {[index:string]:Field},
                                            options : OptionSet,
                                            colors : string[],
                                            newick? : TreeNode,
                                            tree_fields? : string[],
                                            context_width? : number,
                                            identifier_getter : 
                                            (gene:object, 
                                                notation:string, 
                                                taxlevel:(number|string)
                                            ) => object = get_identifiers) {

    const viz : HTMLElement = document.querySelector(selector);
    const d3viz: d3.Selection<HTMLElement> = select(selector);

    // Reset graph div
    erase_graph(selector, div_id, false);
    var parentWidth : number = $(selector).width() - 5;
    var width : number = context_width || Math.max(parentWidth - 1050, 700);
    var nfield : number = Object.keys(fields).length + 1 || 1;
    if (options.showTree) {
        try {
           d3viz.select("div#phylogram").style("display", "inline-block");
            var n_genes = (<any>Object).keys(data).length;
            await draw_newick(selector,
                              newick,
                              nfield,
                              n_genes,
                              tree_fields);
        } catch {
            width = context_width || Math.max(parentWidth - 400, 700);
            d3viz.select("input#showTree").attr("checked", null);
            d3viz.select("div#phylogram").style("display", "none");
        }
    } else {
            width = context_width || Math.max(parentWidth - 400, 700);
            d3viz.select("div#phylogram").style("display", "none");
    }

    // Gene representation dimensions and svg margins
    const margin = { top: 5, right: 5, bottom: 10, left: 10 };
    // Width of stripped arrow (rectangular portion)
    const gene_rect : Rect = { w: (width - margin.right) / (nside.upstream + nside.downstream + 1),
                               h: 17, 
                               ph: 20, 
                               pv: 5 };
    const rect : Rect = { w: (width - margin.right) / (nside.upstream + nside.downstream + 1),
                          h: 17, 
                          ph: 20, 
                          pv: 5 };

    d3viz.select("div#phylogram").style("height", window.innerHeight + "px");
    // LEGEND
    var legend_height = (100 / nfield) + "%";
    var legend = d3viz.select("div#legend");
    var unique_functions = get_unique_functions(data, notation, taxlevel, nside);
    var fn_palette = scale.ordinal()
                    .domain((<any>Object).keys(unique_functions))
                    .range(shuffle([...colors]));
    legend.append("div")
        .attr("class", "split-legend")
        .attr("id","legend-fn")
        .style("height", legend_height);
    draw_legend(selector,
                "legend-fn", 
                notation,
                unique_functions, 
                fn_palette, 
                notation);

    Object.entries(fields).forEach(([f, d] : [string, Field]) => {
        if (d.rep == "circle") {
            let unique = get_unique_functions(data, f, d.level, nside);
            let palette = scale.ordinal()
                            .domain((<any>Object).keys(unique))
                            .range(shuffle([...colors]));
            fields[f].palette = palette;
            legend.append("div")
                .attr("class", "split-legend")
                .attr("id", d.legend.div)
                .style("height", legend_height);
            draw_legend(selector,
                        d.legend.div, 
                        d.legend.title,
                        unique, 
                        palette, 
                        f);
        } else {}
    })
    var sizeScale : any;
    var distScale : any;
    try  {
        let unique = get_unique_functions(data, "size", taxlevel, nside);
        let unique_sizes = (<any>Object).keys(unique).map((n:string)=>+n);
        let scaleRange = [(2/5)*rect.ph + 10, undefined];
        if (options.customScale) scaleRange[0] = +options.customScale;
        let sizeRange = extent(unique_sizes);
        let initialScale = scale.linear()
                        .domain([0, sizeRange[0]])
                        .range([0, scaleRange[0]]);
        scaleRange[1] = initialScale(sizeRange[1]);
        if (!options.scaleDist) scaleRange = [rect.ph+rect.w/5, rect.w];
        distScale = scale.linear()
                        .domain(sizeRange)
                        .range(scaleRange);
        sizeScale = (s:number) => {
            let l = distScale(s) - (2/5)*rect.ph
            return l + rect.ph;
        };
        if (!options.scaleDist) sizeScale = distScale;
    } catch {
        alert("Something went wrong while scaling")
        sizeScale = function(x:number) { return x; }
    }

  // Generate graph
  var svg = d3viz.select("div#synteny")
    .append("svg")
    .attr("id", "synteny")
    .attr("width", width)
    .attr("height", 900)
    .attr("display", "block")
    .attr("overflow-y", "scroll");
  var g = svg
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var scale_svg = d3viz.select("div#synteny")
                 .append("svg")
                 .attr("class", "scale")
                 .append("g");


    var largest_ordinate = 0;
    var counter = 0;
    var central_pos = 0;
    var boundX : {[index:string]:number} = {
        "inf" : 100000,
        "sup" : 0
    }

    // Visit every gene entry and their neighbors to
    // render synteny visualization
    await (<any>Object).entries(data).forEach(([central_gene, d] : [string, Gene]) => {


        //let central_gene : string = d.gene; //central;
        // y coordinate
        var ordinate = get_ordinate(viz, central_gene, central_pos, rect, nfield);
        largest_ordinate = Math.max(largest_ordinate, ordinate);
        central_pos++;

        function swap_strand(s : "+"|"-", reference_s : "+"|"-") {
            if (reference_s == "+" || +reference_s > 0){
                return s;
            } else {
                if (s == "+"){
                    return "-";
                } else if(s == "-") {
                    return "+";
                }
            }
        }
        if (d.neighbourhood[0].strand == "-" || +d.neighbourhood[0].strand < 0) {
            console.log(d.neighborhood[0].unigene)
            let swapped : {[index:string]:Gene} = {};
            for(let p = -nenv; p <= nenv; p++) {
                let swapped_neigh : Gene = d.neighbourhood[p];
                if (swapped_neigh) {
                    let n_strand : "+"|"-" = swapped_neigh.strand ? swapped_neigh.strand : "+";
                    if (swapped_neigh.gene != "NA") {
                        swapped_neigh.strand = swap_strand(n_strand, 
                                                    d.neighbourhood[0].strand);
                    } else {
                        swapped_neigh.strand = "+";
                    }
                }
                swapped[-p] = swapped_neigh;
            }
            d.neighbourhood = swapped;
        }

        // Render neighbor-selection rectangle upon hover
        var gene_path = g.append("path")
                            .attr("class", "archoring-path")
                            .attr("id", "uni" + central_gene)
                            .attr("d",
                                    "M " + (- rect.ph/2) + " " +
                                            (ordinate - rect.pv/2 + 1) + " " +
                                    "L " + (width - margin.right - rect.ph/2) + " " +
                                            (ordinate - rect.pv/2 + 1) + " " +
                                    "L " + (width - margin.right - rect.ph/2)  + " " +
                                            (ordinate + rect.h*nfield - rect.pv/2 - 1) + " " +
                                    "L " + (- rect.ph/2) + " " +
                                           (ordinate + rect.h*nfield - rect.pv/2 - 1) + " " +
                                    "Z")
                            .style("fill", "none")
                            .style("stroke", "var(--highlight)")
                            .style("stroke-width", "1.5px")
                            .style("position", "relative")
                            .style("z-index", 3)
                            .style("visibility", "hidden")
                            .style("opacity", 0)
                            .style("transition", "opacity 0.3s");

        // Tree clades and leafs hover rationale
        tree_hover(selector, central_gene, gene_path);

        // Visit each neighbor and visualize it
        var collapsedDistance = 2;
        var initialX : {[index:string]:number} =  {
            "xf" : (width - margin.right)/2 - rect.w/2,
            "start" : +d.neighbourhood[0].start,
            "end" : +d.neighbourhood[0].end
        }
        var lastX : {[index:string]:number} =  initialX;

        for (var pos = 0; pos <= nside.downstream; pos++) {
            var neigh : Gene = d.neighbourhood[pos];
            var xf : number;
            var x0 : number;
            
            if (neigh && neigh.gene != "NA") {
                if (options.scaleDist || options.collapseDist) {
                    let distance : number;
                    if (options.scaleDist) {
                        distance = distScale(+neigh.start-lastX.end);
                        if (+neigh.start < +lastX.start) {
                            distance = distScale(+lastX.start-neigh.end);
                        }
                    } else {
                        distance = collapsedDistance; 
                    }
                    if (pos == 0) {
                        distance = 0;
                    }
                    x0 = lastX.xf + distance;
                } else {
                    x0 = undefined;
                }

                xf  = draw_neighbor(selector,
                               g,
                               pos,
                               neigh,
                               d,
                               nside,
                               counter,
                               notation,
                               taxlevel,
                               tpred_level,
                               ordinate,
                               rect,
                               gene_rect,
                               sizeScale,
                               fn_palette,
                               gene_path,
                               fields,
                               options,
                               identifier_getter,
                               x0);
                lastX = {
                    "xf" : xf,
                    "start" : neigh.start,
                    "end" : neigh.end
                }
                boundX.sup = Math.max(boundX.sup, xf);
                counter++;
            }

        }
        lastX = initialX;
        for (var pos = -1; pos >= -nside.upstream; pos--) {
            var neigh : Gene = d.neighbourhood[pos];
            var xf : number;
            var x0 : number;

            if (neigh && neigh.gene != "NA") {
                if (options.scaleDist || options.collapseDist) {
                    let distance : number;
                    if (options.scaleDist) {
                        distance = distScale(lastX.start-neigh.end)
                        if (+neigh.start > +lastX.start) {
                            distance = distScale(+neigh.start-lastX.end);
                        }
                    } else {
                        distance = collapsedDistance; 
                    }
                    if (pos == 0) distance = 0;
                    x0 = lastX.xf - distance;
                } else {
                    x0 = undefined;
                }
                xf = draw_neighbor(selector,
                               g,
                               pos,
                               neigh,
                               d,
                               nside,
                               counter,
                               notation,
                               taxlevel,
                               tpred_level,
                               ordinate,
                               rect,
                               gene_rect,
                               sizeScale,
                               fn_palette,
                               gene_path,
                               fields,
                               options,
                               identifier_getter,
                               x0);
                lastX = {
                    "xf" : xf,
                    "start" : neigh.start,
                    "end" : neigh.end
                }
                boundX.inf = Math.min(boundX.inf, xf)
                counter++;
            }
        }
    });



    if (!(
        options.collapseDist || 
        options.scaleDist
    )) {
        //Anchor path
        g.append("path")
            .attr("class", "archoring-path")
            .attr("d",
                    "M" + (nside.upstream * rect.w - 2*rect.ph/5) + " 10 " +
                    "L " + (nside.upstream * rect.w - 2*rect.ph/5) + " " +
                            (largest_ordinate + rect.h*nfield + 2) + " "+
                    "L " + ((nside.upstream+1)*rect.w - 7*rect.ph/10)  + " " +
                            (largest_ordinate + rect.h*nfield + 2) + " "+
                    "L " + ((nside.upstream+1)*rect.w - 7*rect.ph/10) + " 10 " +
                    "Z")
            .style("fill", "none")
            .style("stroke", "var(--dark-gray)");

    }

    var y = largest_ordinate + rect.h*nfield + 65;
    var geco = d3viz.select("svg#synteny")
    if (options.scaleDist) {
        var svgWidth = boundX.sup - boundX.inf;
        geco.attr("width", svgWidth + margin.left);
        //select("div#graph").style("width", svgWidth + 1200 + "px")
        if (boundX.inf < 0) {
            geco.select("g").style("transform", 
                "translate(" + Math.abs(boundX.inf) + margin.left + "px," 
                             + margin.top + "px)");
        } else {
            geco.select("g").style("transform", 
                "translate(" +(-boundX.inf + margin.left) + "px," 
                             + margin.top + "px)");
        }
        
    }
    if (options.scaleDist || options.scaleSize) {
        draw_scale(scale_svg, distScale, 0,  0, "bp")
    }
    d3viz.select("div#synteny").style("height", y + 3 + "px");
    geco.attr("height", y - 40);
    d3viz.select("div#phylogram").style("height", y + 3 + "px");
    d3viz.select("svg#phylogram").attr("height", y - 40);

};


/**
 * Render complete genomic context graph with optional phylogenetic tree
 * @function visualize_geco
 * @param {string} div_id: id of div which will contain the graph.
 *                         Default: "graph" <div id="graph"></div>
 * @param {JSON object} data: genomic context information as JSON object
 * @param {TreeNode} newick: (optional) phylogenetic tree in Newick format.
 * @param {number} nenv: maximum number of genes in neighbourhood
 *                       (central gene included)
 */
export async function visualize_geco(selector : string,
                                    data : {[index:string]:Gene},
                                    newick : TreeNode, 
                                    nenv : number,
                                    colors : string[],
                                    parameters : ParamSet){

    const viz : HTMLElement = document.querySelector(selector);
    const d3viz: d3.Selection<HTMLElement> = select(selector);
    var div_id : string = "graph";

    var { notation, 
          nside, 
          taxlevel,
          tpred_level,
          fields,
          options } = parameters;

    d3viz.select("div#download-btns").style("visibility", "hidden")
                          .style("opacity", 0);
    d3viz.select("div#"+div_id).style("visibility", "hidden")
                          .style("opacity", 0);
    // Download buttons
    create_download_button(selector,
                           'download-tree',
                           'newick.png',
                           'div#phylogram');
    create_download_button(selector,
                           'download-json',
                           'genomic_context.json',
                           undefined,
                           data);
    create_download_button(selector,
                           'download-context',
                           'genomic_context.png',
                           "#" + div_id);
    // Generate graph
    await draw_genomic_context(selector,
                               div_id,
                               data,
                               notation,
                               taxlevel,
                               tpred_level,
                               nside,
                               +nenv,
                               fields,
                               options,
                               colors,
                               newick,
                               ["name", "tax id", "tax desc", "gene"]);
    viz.querySelector("div#submit-params").scrollIntoView({behavior: "smooth"});
    d3viz.select("div#download-btns").style("visibility", "visible")
                          .style("opacity", 1);
    d3viz.select("div#"+div_id).style("visibility", "visible")
                            .style("opacity", 1);
    try {
        viz.querySelector("path.anchor-stroke").scrollIntoView({behavior: "smooth", block: "nearest", inline: "center"});
    } catch {}
}
