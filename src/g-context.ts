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
         draw_rect } from './render-html';
import { shuffle } from './helpers';
import { create_popper } from './popper';
import { Margin,
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
      (<any>Object).entries(data).forEach(([unigene, d] : [string, Gene]) => {
          if (unigene != "NA") {
              (<any>Object).values(d.neighborhood).forEach((neigh : Gene)=> {
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
      (<any>Object).entries(d.neighborhood).forEach(([pos, n] : 
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
async function draw_newick(newick : TreeNode,
                           nfield : number,
                           nleaf : number) {

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

    buildPhylogram('#phylogram', newick, {
      width: 100,
      height: nleaf * nfield * 21
    });


    //await fetch(file)
          //.then(response => response.text())
          //.then(data => {
                //var newick : any = parseNewick(data)
                //var newickNodes = []
                //function buildNewickNodes(node : TreeNode) {
                  //newickNodes.push(node)
                  //if (node.branchset) {
                    //for (var i=0; i < node.branchset.length; i++) {
                      //buildNewickNodes(node.branchset[i])
                    //}
                  //}
                //}
                //buildNewickNodes(newick)
                //buildPhylogram('#phylogram', newick, {
                  //width: 100,
                  //height: nleaf * nfield * 21
                //});
        //})


  };


/**
 * Draw legend based on unique functional data
 * @function draw_legend
 * @param {object} unique_functions: dictionary with unique functional data and description
 * @param {scaleOrdinal} palette: color palette associated to unique_functions keys
 * @param {string} notation: string defining name of field in JSON data
 *                           with which to color genomic context
 */
function draw_legend(div_id : string,
                    title : string,
                    unique_functions : object, 
                    palette : scale.ordinal, 
                    notation : string) : void{
    if (notation == "GMGFam"){
        var factor = 30;
    } else {
        var factor = 40;
    }
    var legend = select("div#" + div_id);
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

    (<any>Object).entries(unique_functions).forEach(([id, f] : [number|string, string]) => {
        let div = legend.append("div")
                        .attr("id", "id"+String(id).replace("@", ""))
                        .style("outline", "none")
                        .style("display", "flex");
        div.append("svg")
           .attr("width", 40)
           .attr("height", 40)
           .style("display", "inline-block")
            .append("circle")
         .attr("r", 6)
         .attr("cx", 20)
         .attr("cy", 6.5)
         .style("fill", palette(id));
      var t = div.append("div")
           .style("display", "inline-block")
           .style("outline", "none")
           //.attr('class', 'mw-collapsible')
     if (notation == 'KEGG') {
        t.html('<a href=" \
                https://www.kegg.jp/dbget-bin/www_bget?map' +
                id + '" target="_blank" style="outline:none;">'+id+'</a><br>' + f);

     } else {
         t.html("<em>" + id + "</em>" + "<br>" +f)
     }
    })
}


/**
 * Create button for downloading graph embedded in div_id div
 * @function create_download_button
 * @param {string} div_id: id of div which will contain the graph.
 *                         Default: "graph" <div id="graph"></div>
 */
export function create_download_button(btn_id : string, 
                                       filename : string,
                                       div_selector?: string,
                                       data? : JSON, 
                                       url? : string) : void {
    var btn = document.getElementById(btn_id);

    var r = document.querySelector(':root');
    var rs = getComputedStyle(r);
    var sand : string = String(rs.getPropertyValue('--sand'));

   if (div_selector) {
        btn.onclick = function() {
            var graph = document.querySelector(div_selector);
            select(div_selector + "::-webkit-scrollbar")
                .style("display", "none");
            // Change background color
            select(':root').style('--sand', 'white');
            toBlob(graph , undefined)
                .then(function (blob : Blob) {
                    saveAs(blob, filename);
        });
            // Reset css
            select(div_selector + "::-webkit-scrollbar")
                .style("display", "initial");
            select(':root').style('--sand', sand);
        }
   } else if (data) {
       btn.onclick = function () {
           console.log(data)
           var blob = new Blob([JSON.stringify(data)], {
                         type: "application/json"
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
 * @param {string} unigene: central gene unigene
 * @param {number} counter: unique identifier
 * @param {object} rect: gene representation dimensions
 */
function get_ordinate(unigene : string, 
                      central_pos : number, 
                      rect : Rect,
                      nfield : number,
                     ) : number{
    let id = "g#uni" + unigene;
    try {
        let top = document.querySelector(id).getBoundingClientRect().top -
                  document.getElementById("phylogram").getBoundingClientRect().top;
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
export function erase_graph(div_id : string, full_reset : boolean) : void {
      // Remove required tags
      selectAll("div.required").html("");
      // Remove previous poppers if any
      selectAll(".popper").remove();
      // Remove previously computed graph
      select("svg#synteny").remove();
      selectAll("svg.scale").remove();
      select("svg#phylogram").remove();
      select("div#download-btns").style("visibility", "hidden")
                              .style("opacity", 0);
      select("div#" + div_id)
            .style("visibility", "hidden")
            .style("opacity", 0);
      var legend = document.querySelector("div#legend");
      while(legend.lastChild) { legend.lastChild.remove(); }
    if (full_reset){
      try {
        // If there were custom select boxes we must reset previously selected
        // parameters
        var nUpstream = select("select#nUpstream");
        nUpstream.selectAll("*").remove();
        nUpstream.append("option")
             .attr("value", 10)
             .attr("disabled", "")
             .attr("selected", "")
             .html("Genes upstream");
        var nDownstream = select("select#nDownstream");
        nDownstream.selectAll("*").remove();
        nDownstream.append("option")
             .attr("value", 10)
             .attr("disabled", "")
             .attr("selected", "")
             .html("Genes downstream");
        var tlevel = select("select#tax-rank");
        tlevel.selectAll("*").remove();
        tlevel.append("option")
             .attr("value", "superkingdom")
             .attr("disabled", "")
             .attr("selected", "")
             .html("Taxonomic rank");
        var enot = select("select#notation");
        enot.selectAll("*").remove();
        enot.append("option")
            .attr("value", "KEGG")
            .attr("disabled", "")
            .attr("selected", "")
            .html("KEGG");
        enot.append("option")
            .attr("value", "preferred_name")
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
        var ephy = select("select#egg-level");
        ephy.attr("disabled", "");
        ephy.selectAll("*").remove();
        ephy.append("option")
            .attr("value", "")
            .attr("disabled", "")
            .attr("selected", "")
            .html("eggNOG tax-level");

        // Remove previously created custom select boxes for re-rendering
        var select_boxes = document.querySelectorAll("div.select-selected");
        select_boxes.forEach(box => box.remove());
        var select_options = document.querySelectorAll("div.select-items");
        select_options.forEach(opt => opt.remove());
      } catch(e){}
      select("div#submit-params")
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

    if (strand == "-") {
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


function legend_listeners(notation : string,
                        ids : string[],
                        highlight : "stroke" | "circle") {
    var mouseover = function () {
        ids.forEach((i : string) => {
            if (i != "") {
                if (notation == "KEGG") {
                    var legend_name = document.querySelectorAll("div#id"+
                                        i.replace("@", "")+">div>a");
                } else {
                    var legend_name = document.querySelectorAll("div#id"+
                                        i.replace("@", "")+">div>em");
                }

                legend_name.forEach(l => {
                    l.setAttribute("style",
                        "color: #ff8c00;\
                        transition: color 0.3s")
                })
            }
        });
    };
      var mouseleave = function () {
        ids.forEach((i : string) => {
            if (i != "") {
                if (notation == "KEGG") {
                    var legend_name = document.querySelectorAll("div#id"+
                                        i.replace("@", "")+">div>a");
                } else {
                    var legend_name = document.querySelectorAll("div#id"+
                                        i.replace("@", "")+">div>em");
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
            document.querySelectorAll("div#id"+i.replace("@", ""))
                .forEach(d => {
                    var t = d.querySelector("em")
                    if (notation == "KEGG") {
                        t = d.querySelector("a");
                    }
                    d.addEventListener("mouseover", () => {
                        if (highlight == "stroke") {
                            selectAll("path.stroke." + d.getAttribute("id"))
                                    .style("opacity", 1);
                        } else if (highlight == "circle") {
                            selectAll("circle#" + d.getAttribute("id"))
                                    .style("stroke", "black")
                                    .style("stroke-width", "2px");
                        }
                        t.setAttribute("style", "color: #ff8c00;");
                    });
                    d.addEventListener("mouseleave", () => {
                        if (highlight == "stroke") {
                            selectAll("path.stroke." + d.getAttribute("id"))
                                    .style("opacity", 0);
                        } else if (highlight == "circle") {
                            selectAll("circle#" + d.getAttribute("id"))
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

function gene_hover(central_gene : string, 
                    notation : string,
                    nside : number,
                    abcissa : number,
                    ids : string[],
                    unigene_path : d3.Selection<SVGPathElement>,
                    rectangles : any[], 
                    text : any,
                    arrow : any){

    var { mouseover, mouseleave } = legend_listeners(notation, ids, "stroke");
    // Stroke rationale
    var over_gene = function () {
        select("path#" + select(this).attr("id") + ".stroke")
          .style("opacity", 1);
        select("text#" + select(this).attr("id") + ".notation")
          .style("fill", "var(--black)");
        var leaf = select("g#uni" + central_gene);
        leaf.select("circle")
          .style("stroke", "#ff8c00")
          .style("fill", "#ff8c00")
          .style("transition", "stroke 0.3s")
          .style("transition", "fill 0.3s");
        leaf.select("text")
            .style("fill", "#ff8c00")
            .style("transition", "fill 0.3s");
        if (abcissa == nside) {
            unigene_path.style("visibility", "visible").style("opacity", 1);
        }
        mouseover();
    };
      var leave_gene = function () {
        select("path#" + select(this).attr("id") + ".stroke")
         .style("opacity", 0);
        select("text#" + select(this).attr("id") + ".notation")
          .style("fill", "var(--sand)");
        var leaf = select("g#uni" + central_gene);
        leaf.select("circle")
          .style("stroke", "#663399")
          .style("fill", "#9370db")
          .style("transition", "stroke 0.3s")
          .style("transition", "fill 0.3s");
        leaf.select("text")
            .style("fill", "var(--dark-gray)")
            .style("transition", "fill 0.3s");
        if (abcissa == nside) {
            unigene_path.style("visibility", "hidden").style("opacity", 0);
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


function tree_hover(central_gene : string,
                    unigene_path : d3.Selection<SVGPathElement>) {
    var unigene_leaf : 
        d3.Selection<HTMLElement> = select("g#uni" + central_gene);
    if (unigene_leaf){
        let highlight_uni = function(unigene_leaf : d3.Selection<HTMLElement>,
                                     unigene_path : d3.Selection<SVGPathElement>) {
            unigene_leaf.select("circle")
              .style("stroke", "#ff8c00")
              .style("fill", "#ff8c00")
              .style("transition", "stroke 0.3s")
              .style("transition", "fill 0.3s");
            unigene_leaf.select("text")
                .style("fill", "#ff8c00")
                .style("transition", "fill 0.3s");
            unigene_path.style("visibility", "visible").style("opacity", 1);

        }
        let hide_uni = function(unigene_leaf : d3.Selection<HTMLElement>,
                                unigene_path : d3.Selection<SVGPathElement>) {
            unigene_leaf.select("circle")
              .style("stroke", "#663399")
              .style("fill", "#9370db")
              .style("transition", "stroke 0.3s")
              .style("transition", "fill 0.3s");
            unigene_leaf.select("text")
                .style("fill", "var(--dark-gray)")
                .style("transition", "fill 0.3s");
            unigene_path.style("visibility", "hidden").style("opacity", 0);
        }
        unigene_leaf.on("mouseover", () => {
                highlight_uni(unigene_leaf, unigene_path);
            });
        unigene_leaf.on("mouseleave", () => {
                hide_uni(unigene_leaf, unigene_path);
            })
        var inner_clades : any = document
                              .querySelectorAll("circle.c" + central_gene);
        inner_clades.forEach((clade : HTMLElement) => {
            clade.addEventListener("mouseover", () => {
                clade.setAttribute("stroke", "#ff8c00");
                clade.setAttribute("fill", "#ff8c00");
                unigene_path.style("visibility", "visible")
                            .style("opacity", 1);
                highlight_uni(unigene_leaf, unigene_path);
            })
            clade.addEventListener("mouseleave", () => {
                clade.setAttribute("stroke", "#5d5d5d");
                clade.setAttribute("fill", "#5d5d5d");
                unigene_path.style("visibility", "visible")
                            .style("opacity", 0);
                hide_uni(unigene_leaf, unigene_path);
            })
        })
    }
}


function draw_neighbor(g : d3.Selection<SVGElement>,
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
                       unigene_path : d3.Selection<SVGPathElement>,
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
                if (neigh.strand == "+"){
                    x0 -= 2*rect.ph/5;
                }
            } else {
                if (neigh.strand == "-") {
                    x0 += 2*rect.ph / 5;
                    xf = x0 + gene_rect.w - rect.ph;
                } else {
                    xf += gene_rect.w - rect.ph + 2*rect.ph / 5;
                }
            }

        } else {
            x0 = abcissa * rect.w + Math.abs(rect.w/2 - gene_rect.w/2);
        }
        if (pos == 0 && fields.n) {
            let n = d.neighborhood.n || neigh.n_contig || " ";
            atext(g,
                  n + fields.n.text,
                  nside.upstream * rect.w + rect.w / 2 - rect.ph / 1.4 - 2.5 * (String(n).length-1),
                  ordinate + gene_rect.h / 1.7 + gene_rect.h * fields.n.y);
        }

        // Only render genes present and within nside
        if ((<any>Object).keys(neigh).length > 1 &&
            neigh.unigene != "NA"){
            var identifiers = identifier_getter(neigh, notation, taxlevel);

            // Fill
            var fill : string = "";
            var identifiers_ks : string[] = [];
            try {
                identifiers_ks = (<any>Object).keys(identifiers);
            } catch {};
            if (identifiers_ks.length != 0 && 
                ["", "NA", "undefined"].every(i => i!=identifiers_ks[0])){
                let ids = identifiers_ks;
                 if (neigh.strand == "-") {
                    fill = String(fn_palette(ids[0]));
                } else { 
                    fill = String(fn_palette(ids[ids.length-1]));
                }
            } else {
                fill = "var(--nodata)";
                identifiers = {"":""}
                identifiers_ks = (<any>Object).keys(identifiers);
            }

            var bar_width = (gene_rect.w - rect.ph) / identifiers_ks.length;
            var rectangles : d3.Selection<SVGRect>[] = [];
            var id_string = "";

            var nrect = 0;
            identifiers_ks.forEach((id : string) => {
                var gene_rect_fill : string = "var(--nodata)";
                if(["", "NA", undefined].every(i => i!=id)){
                    gene_rect_fill = String(fn_palette(id));
                }
                rectangles.push(draw_rect(g,
                             x0 + bar_width * nrect,
                             ordinate,
                             bar_width,
                             gene_rect.h - rect.pv,
                             gene_rect_fill,
                             "idx" + counter));

                id_string += " id" + String(id).replace("@", "");
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
              .attr("fill", fill)
              .style("outline", "none")
              .style("cursor", "pointer")
              .attr("id", "idx" + counter);

            // Add hoverable stroke that sorrounds gene arrow
            let central_gene : string = d.neighborhood[0].unigene
             g.append("path")
              .attr("class", "stroke" + id_string + " ord" + central_gene)
              .attr("id", "idx" + counter)
              .attr("d", stroke_path)
              .style("opacity", 0)
              .style("transition", "opacity 0.3s");

            if (pos == 0 && options.highlightAnchor) {
                var anchor_stroke = g.append("path")
                  .attr("class", "anchor-stroke")
                  .attr("d", stroke_path)
                  .style("opacity", 1)

                
                $("span#highlightAnchor").click(() => {
                    if ($("input#highlightAnchor").is(":checked")) {
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

            if(options.showName && ["", "NA", undefined].every(i => i!=neigh.preferred_name)){
                // Only display when it fits
                //&& gene_rect.w - gene_rect.ph >= 35
                //&& neigh.preferred_name.length < 7) {

                // // 6 is size per char
                let size : number = +Math.floor(gene_rect.w / 13.5); 
                let name : string = neigh.preferred_name;
                if (size < name.length){
                    name = name.slice(0, size);
                    
                }
                text.text(name)
                    .style('opacity', 1)
                    .style("fill", "var(--sand)");
            }

            // Hover effect over gene representation
            gene_hover(central_gene, 
                        notation,
                        nside.upstream,
                        abcissa,
                        identifiers_ks,
                        unigene_path,
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
                    let { mouseover, mouseleave } = legend_listeners(f,
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
                      if (neigh.strand == "-"){
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

            create_popper(pos,
                          neigh,
                          notation,
                          taxlevel,
                          tpred_level,
                          counter);
        }
    return xf;
}


function get_parameters() {

    // Manage notation input
    var enot : HTMLFormElement = document.querySelector("select#notation");
    var notation : string = enot.options[enot.selectedIndex].value;
    // Manage number of genes to display on sides
    var eups : HTMLFormElement = document.querySelector("select#nUpstream");
    var nups : number = +eups.options[eups.selectedIndex].value;
    // Manage number of genes to display on sides
    var edowns : HTMLFormElement = document.querySelector("select#nDownstream");
    var ndowns : number = +edowns.options[edowns.selectedIndex].value;
    // Manage eggNOG taxonomic levels
    var ephy : HTMLFormElement = document.querySelector("select#egg-level")
    var taxlevel : (number|string) = +ephy.options[ephy.selectedIndex].value;

    // Add additional fields to represent
    var fields : {[index:string] : Field} = {};
    // Manage taxonomic prediction levels
    var etax : HTMLFormElement = document.querySelector("select#tax-rank")
    var tpred_level : string = etax.options[etax.selectedIndex].value;

    var taxChecked : boolean = $("input#tax-rank").is(":checked");
    // Show phylogram
    var showTree : boolean = $("input#showTree").is(":checked");
    // Show gene preferred name
    var showName : boolean = $("input#geneName").is(":checked");
    // Show gene preferred name
    var nContig : boolean = $("input#nContig").is(":checked");
    // Scale gene length?
    var scaleSize : boolean = $("input#scaleSize").is(":checked");
    // Show genomic position of gene
    var showPos : boolean = $("input#showPos").is(":checked");
    // Highlight anchor gene
    var highlightAnchor : boolean = $("input#highlightAnchor").is(":checked");


    var edist : HTMLFormElement = document.querySelector("select#distScale");
    var distScale : string = edist.options[edist.selectedIndex].value;
    
    var customScale : number = +(<HTMLInputElement>document.querySelector("input#customScale")).value;

    var options : OptionSet = {
        "showTree" : showTree,
        "showName" : showName,
        "collapseDist" : distScale == "collapseDist",
        "scaleDist" : distScale == "scaleDist",
        "scaleSize" : scaleSize,
        "customScale" : customScale,
        "nContig" : nContig,
        "highlightAnchor" : highlightAnchor
    }

    if (showPos) {
        fields["showPos"] = {
            rep : "text",
            y : +Object.keys(fields).length + 1
        }
    }
    if (nContig) {
        fields["n"] = {
            rep : "text",
            text: "",
            y : +Object.keys(fields).length + 1
        }
    } 

    if (taxChecked) {
        fields["tax_prediction"] = {
            rep : "circle",
            circle : {
                r : 7
            },
            level : tpred_level,
            legend : {
                div : "tax-pred",
                title : "Taxonomic prediction (" + tpred_level + ")"
            },
            y : +Object.keys(fields).length + 1
        }
    } else {
        try { delete fields["tax_prediction"] } catch {};
    }

    if (options.scaleDist) {
        options.scaleSize = true;
        select("input#scaleSize").attr("checked", "");
        options.highlightAnchor = true;
        select("input#highlightAnchor").attr("checked", "");
    }

    return {
        notation: notation,
        nside: {upstream: nups, downstream: ndowns},
        taxlevel: taxlevel,
        tpred_level: tpred_level,
        fields: fields,
        options: options
    }
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
 * @param {number} nenv: maximum number of genes in neighborhood
 *                       (central gene included)
 * @param {number} context_width: width of genomic context graph
 *                                (legend excluded)
 * @param {TreeNode} newick: (optional) phylogenetic tree in Newick format.
 * @param {string} colors_file: path to file containing colors in array format
 * @param {function} identifier_getter: (optional) custom function to retrieve
 *                                      "identifier data" which will be used
 *                                      to color the different genes
 *                                      Params: gene, notation, taxlevel
 */
export async function draw_genomic_context(div_id : string,
                                            data : {[index:string]:Gene},
                                            notation : string,
                                            taxlevel : (number|string),
                                            tpred_level : string,
                                            nside : NSide,
                                            nenv : number,
                                            fields : {[index:string]:Field},
                                            options : OptionSet,
                                            colors_file : string,
                                            newick? : TreeNode,
                                            context_width? : number,
                                            identifier_getter : 
                                            (gene:object, 
                                                notation:string, 
                                                taxlevel:(number|string)
                                            ) => object = get_identifiers) {

    // Reset graph div
    erase_graph(div_id, false);
    var width : number = context_width || Math.max(window.innerWidth - 1200, 1000);
    var nfield : number = Object.keys(fields).length + 1 || 1;
    if (options.showTree) {
        try {
            select("div#phylogram").style("display", "inline-block");
            var n_unigenes = (<any>Object).keys(data).length;
            await draw_newick(newick,
                              nfield,
                              n_unigenes);
        } catch {
            width = context_width || Math.max(window.innerWidth - 500, 1000);
            select("input#showTree").attr("checked", null);
            select("div#phylogram").style("display", "none");
        }
    } else {
            width = context_width || Math.max(window.innerWidth - 500, 1000);
            select("div#phylogram").style("display", "none");
    }

    // Gene representation dimensions and svg margins
    const margin = { top: 5, right: 5, bottom: 10, left: 10 };
    // Width of stripped arrow (rectangular portion)
    const gene_rect : Rect = { w: (width - margin.right) / (nside.upstream + nside.downstream + 1),
                               h: 20, 
                               ph: 20, 
                               pv: 5 };
    const rect : Rect = { w: (width - margin.right) / (nside.upstream + nside.downstream + 1),
                          h: 20, 
                          ph: 20, 
                          pv: 5 };

    select("div#phylogram").style("height", window.innerHeight + "px");
    // Create color palette
    // 34 differentiable colors
    var colors : string[] = []
    await fetch(colors_file)
        .then(response => response.text())
        .then(hex => colors = eval(hex))

    // LEGEND
    var legend_height = (100 / nfield) + "%";
    var legend = select("div#legend");
    var unique_functions = get_unique_functions(data, notation, taxlevel, nside);
    var fn_palette = scale.ordinal()
                    .domain((<any>Object).keys(unique_functions))
                    .range(shuffle([...colors]));
    legend.append("div")
        .attr("class", "split-legend")
        .attr("id","legend-fn")
        .style("height", legend_height);
    draw_legend("legend-fn", 
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
            draw_legend(d.legend.div, 
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
  var svg = select("div#synteny")
    .append("svg")
    .attr("id", "synteny")
    .attr("width", width)
    .attr("height", 900)
    .attr("display", "block")
    .attr("overflow-y", "scroll");
  var g = svg
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var scale_svg = select("div#synteny")
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

    // Visit every unigene entry and their neighbors to
    // render synteny visualization
    await (<any>Object).entries(data).forEach(([central_gene, d] : [string, Gene]) => {


        //let central_gene : string = d.unigene; //central;
        // y coordinate
        var ordinate = get_ordinate(central_gene, central_pos, rect, nfield);
        largest_ordinate = Math.max(largest_ordinate, ordinate);
        central_pos++;

        // Display swapped rows
/*        if (d.neighborhood[0].swapped || d.neighborhood[0].strand == "-") {*/
            //g.append("rect")
              //.attr("x", -rect.ph / 2)
              //.attr("y", ordinate - rect.pv / 2 + 1)
              //.attr("width", width - margin.right)
              //.attr("height", gene_rect.h - 2)
              //.style("position", "relative")
              //.style("z-index", -10)
              //.style("outline", "none")
              //.attr("fill", "#744013")
              //.attr("opacity", 0.1);
        /*}*/
        function swap_strand(s : "+"|"-", reference_s : "+"|"-") {
            if (reference_s == "+"){
                return s;
            } else {
                if (s == "+"){
                    return "-";
                } else if(s == "-") {
                    return "+";
                }
            }
        }
        if (d.neighborhood[0].strand == "-") {
            let swapped : {[index:string]:Gene} = {};
            for(let p = -nenv; p <= nenv; p++) {
                try {
                    let swapped_neigh : Gene = d.neighborhood[p];
                    swapped_neigh.strand = swap_strand(swapped_neigh.strand, 
                                                d.neighborhood[0].strand);
                    swapped[-p] = swapped_neigh;
                } catch {}
            }
            
        }

        // Render neighbor-selection rectangle upon hover
        var unigene_path = g.append("path")
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
                            .style("stroke", "#ff8c00")
                            .style("stroke-width", "1.5px")
                            .style("position", "relative")
                            .style("z-index", 3)
                            .style("visibility", "hidden")
                            .style("opacity", 0)
                            .style("transition", "opacity 0.3s");

        // Tree clades and leafs hover rationale
        tree_hover(central_gene, unigene_path);

        //if (fields.showPos) {
            //draw_genomic_path(g, 
                              //width,
                              //ordinate, 
                              //fields.showPos.y, 
                              //rect, 
                              //margin);
        //}

        // Visit each neighbor and visualize it
        var collapsedDistance = 2;
        var initialX : {[index:string]:number} =  {
            "xf" : (width - margin.right)/2 - rect.w/2,
            "start" : +d.neighborhood[0].start,
            "end" : +d.neighborhood[0].end
        }
        var lastX : {[index:string]:number} =  initialX;

        for (var pos = 0; pos <= nside.downstream; pos++) {
            var neigh : Gene = d.neighborhood[pos];
            var xf : number;
            var x0 : number;
            
            if (neigh && neigh.unigene != "NA") {
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
                        //if (neigh.size) {
                            //distance = Math.abs(rect.w/2 - sizeScale(neigh.size)/2);
                        //} else {
                            //distance = 0;
                        //}                    
                        distance = 0;
                    }
                    x0 = lastX.xf + distance;
                } else {
                    x0 = undefined;
                }

                xf  = draw_neighbor(g,
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
                               unigene_path,
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
            var neigh : Gene = d.neighborhood[pos];
            var xf : number;
            var x0 : number;

            if (neigh && neigh.unigene != "NA") {
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
                xf = draw_neighbor(g,
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
                               unigene_path,
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
        (options.collapseDist && options.scaleSize) || 
        options.scaleDist
    )) {
        //Anchor path
        g.append("path")
            .attr("class", "archoring-path")
            .attr("d",
                    "M" + (nside.upstream * rect.w - rect.ph/3) + " 10 " +
                    "L " + (nside.upstream * rect.w - rect.ph/3) + " " +
                            (largest_ordinate + rect.h*nfield + 2) + " "+
                    "L " + ((nside.upstream+1)*rect.w - rect.ph/2)  + " " +
                            (largest_ordinate + rect.h*nfield + 2) + " "+
                    "L " + ((nside.upstream+1)*rect.w - rect.ph/2) + " 10 " +
                    "Z")
            .style("fill", "none")
            .style("stroke", "var(--dark-gray)");

    }

    var y = largest_ordinate + rect.h*nfield + 65;
    var geco = select("svg#synteny")
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
    select("div#synteny").style("height", y + 3 + "px");
    geco.attr("height", y - 40);
    select("div#phylogram").style("height", y + 3 + "px");
    select("svg#phylogram").attr("height", y - 40);

};


/**
 * Render complete genomic context graph with optional phylogenetic tree
 * @function render_graph
 * @param {string} div_id: id of div which will contain the graph.
 *                         Default: "graph" <div id="graph"></div>
 * @param {JSON object} data: genomic context information as JSON object
 * @param {TreeNode} newick: (optional) phylogenetic tree in Newick format.
 * @param {number} nenv: maximum number of genes in neighborhood
 *                       (central gene included)
 */
export async function render_graph(div_id : string ="graph",
                                    data : {[index:string]:Gene},
                                    nenv : number,
                                    colors_file : string,
                                    newick : TreeNode){

    var { notation, 
          nside, 
          taxlevel,
          tpred_level,
          fields,
          options } = get_parameters();

    select("div#download-btns").style("visibility", "hidden")
                          .style("opacity", 0);
    select("div#"+div_id).style("visibility", "hidden")
                          .style("opacity", 0);
    // Download buttons
    create_download_button('download-tree',
                           'newick.png',
                           'div#phylogram');
    create_download_button('download-json',
                           'genomic_context.json',
                           undefined,
                           data);
    create_download_button('download-context',
                           'genomic_context.png',
                           "#" + div_id);
    // Generate graph
    await draw_genomic_context(div_id,
                               data,
                               notation,
                               taxlevel,
                               tpred_level,
                               nside,
                               +nenv,
                               fields,
                               options,
                               colors_file,
                               newick);
    document.querySelector("div#submit-params").scrollIntoView({behavior: "smooth"});
    select("div#download-btns").style("visibility", "visible")
                          .style("opacity", 1);
    select("div#"+div_id).style("visibility", "visible")
                            .style("opacity", 1);
    try {

        document.querySelector("path.anchor-stroke").scrollIntoView({behavior: "smooth", block: "nearest", inline: "center"});
    } catch {}
    //}
}
