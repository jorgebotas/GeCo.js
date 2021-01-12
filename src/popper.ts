import { select, scale } from 'd3';
import { createPopper } from '@popperjs/core';

import { pad_with_zeroes,
         remove_item,
         lookForParent } from './helpers';
import { Gene, Notation } from './interfaces';
import { draw_protDomains } from './domains';


/**
 * Return popper content formatted as html
 * @function get_popper_html
 * @param {number} pos: relative position of gene from central gene
 * @param {object} neigh: gene information of neighbor/central gene
 * @param {number} counter: unique identifier.
 *                          Associated to particular gene in graph
 */
function get_popper_html(pos : number, 
                         neigh : Gene,
                         notation : string,
                         taxlevel : (number|string),
                         tpred_level : string) : string{
    var kegg_links = "<ul id='popper'>\
        <li id='popper-cog'>KEGG</li>";
    var eggnog_data = "<ul id='popper'>\
        <li id='popper-cog'>eggNOG</li>";
    if (pos == 0) {
        var kegg_links_bk = kegg_links;
        var eggnog_data_bk = eggnog_data;
        try {
            let kegg_scores = neigh.KEGG.prediction.scores;
            (<any>Object).entries(kegg_scores).forEach(([s, v] : 
                                    [string, number|string]) => {
                kegg_links += "<li><em>" + s + "</em>: " + v + "</li>";
            })
        } catch { kegg_links = kegg_links_bk; }
        try {
            let egg_scores = neigh.eggNOG.prediction.scores;
            (<any>Object).entries(egg_scores).forEach(([s, v] :
                                    [string, number|string]) => {
                eggnog_data += "<li><em>" + s + "</em>: " + v + "</li>";
            })

        } catch { eggnog_data = eggnog_data_bk; }
    }

    // KEGG data
     try {
            var kegg_ids = (<any>Object).keys(neigh.KEGG);
            var keggs : any = neigh.KEGG;
            if (neigh.KEGG.prediction) {
                 kegg_ids = (<any>Object).keys(neigh.KEGG.prediction);
                 keggs = neigh.KEGG.prediction;
             }
            kegg_ids = remove_item(kegg_ids, 'scores');

            if (kegg_ids[0] != "" && kegg_ids.length != 0){
                 kegg_ids.forEach((id : number|string) => {
                    let kegg_id = pad_with_zeroes(id, 5);
                    let k = keggs[kegg_id];
                    kegg_links += '<li><a href=" \
                            https://www.kegg.jp/dbget-bin/www_bget?map' +
                            kegg_id + '" target="_blank">'+kegg_id+'</a> ';
                            if (pos == 0 && 
                                k.percentage != "NA" &&
                                k.percentage){
                                kegg_links += "(" + k.percentage + ")\n";
                            }
                     kegg_links += k.description + "</li>";
                })
                kegg_links += "</ul>";
            } else { kegg_links = "" ;};

     } catch {
         kegg_links = "";
     }

    // eggNOG data
     try { 
            var eggnog_ids = (<any>Object).keys(neigh.eggNOG);
            var eggs : any = neigh.eggNOG;
            if (neigh.eggNOG.prediction) { 
                eggnog_ids = (<any>Object).keys(neigh.eggNOG.prediction);
                eggs = neigh.eggNOG.prediction;
            }
            eggnog_ids = remove_item(eggnog_ids, 'scores');

            if (eggnog_ids[0] != "" && eggnog_ids.length != 0) {
                if(notation != "eggNOG" || taxlevel == "") {
                        (<any>Object).entries(eggs).forEach(([i, l] : 
                                              [number|string, {[index : string]
                                                  : Notation}]) => {
                            if (i != 'scores') {
                                (<any>Object).values(l).forEach((v : Notation) => {
                                    eggnog_data += "<li><em>" + v.id + "</em> ";
                                    if (pos == 0 && v.id != "" && v.percentage){
                                        eggnog_data += "(" + v.percentage + ")";
                                    }
                                        eggnog_data += "\n" + v.description + "</li>";
                                })
                            }
                        });
                } else {
                    try {
                        (<any>Object).entries(eggs[taxlevel]).forEach(([id, d] : 
                                                [string, Notation]) => {
                            eggnog_data += "<li><em>" + id + "</em> ";
                            if (pos == 0){
                                eggnog_data += "(" + d.percentage + ")";
                            }
                            eggnog_data += "\n" + d.description;
                        })
                    } catch {};

                }
                eggnog_data += "</ul>"
            } else { eggnog_data = ""; }


     } catch {
        eggnog_data = "";
     }


    var popper_html = "";
    if (["", "NA", undefined].every(i => i!=neigh.preferred_name)){
        popper_html += neigh.preferred_name + "<br>";
    }
    if (neigh.size) {
        popper_html += "Length: " + neigh.size + "bp<br>";
    }
    if (neigh.start) {
        popper_html += "Start: " + neigh.start + "bp<br>" + 
                       "End: " + neigh.end + "bp<br>";
    }
     if (neigh.strand) {
         popper_html += "Strand: " + neigh.strand + "<br>";
     }
    if (neigh.gene) {
        popper_html += "<br><strong>Gene</strong><br>" + 
                        neigh.gene + "<br>";
    }
    if (pos != 0) {
        if(neigh.frequency) {
            popper_html += "Frequency: " + neigh.frequency + "<br>";
        }
    }
    if (neigh.n_contig) {
        popper_html += "Analysed contigs: " + neigh.n_contig + "<br>";
    }
     if (neigh.gene) {
        var pathInit = window.location.pathname.split("/")[1];
        popper_html += "<a href='/" + pathInit + "/genecontext/" + 
                       neigh.gene +"' target='_blank'>\
                                 Unique contigs</a><br>";
     }
     if (neigh.domains) {
         popper_html += "<div class='py-2' id='dom" + neigh.gene + "'></div>"
     }
     if (neigh.GMGFam) {
        popper_html += "<br><strong>GMGFam</strong><br>" +
                                 neigh.GMGFam + "<br><br>";
     }
     try {
        let p : string = Object.keys(neigh.tax_prediction[tpred_level])[0];
        popper_html += "<strong>Taxonomic prediction</strong><br>" +
                       tpred_level + ": " +
                       neigh.tax_prediction[tpred_level][p].description + "<br><br>"

     } catch {}
     if (kegg_links != "" || eggnog_data != "") {
         popper_html += "<div id='popper'>" +
                        eggnog_data +
                        kegg_links +
                        "</div>";
     }
     if (neigh.metadata) {
        popper_html += "<br><br><strong>Metadata</strong><br>" +
                    neigh.metadata
     }
    return popper_html
};

/**
 * Create custom  popover
 * @function create_popper
 * @param {string} id: id of target element
 * @param {string} popper_html: popover content
 * @param {string} popper_class
 */
export function apopper(id : string,
                        popper_html : string,
                        popper_class : string) {
    var popper_d3 = select("body")
                   .append("div")
                   .attr("class", "popper " + popper_class)
                   .attr("id", id);
    // popper content
    popper_d3.append("div")
             .attr("class", "popper-content card-body h6 pt-2")
             .html(popper_html);
    // popper arrow
    popper_d3.append("div")
             .attr("class", "popper-arrow d-none");
    var popper : HTMLElement = document.querySelector(".popper#" + id);
    var ref_text : HTMLElement = document.querySelector("text#" + id);
      function create() {
          // Popper Instance
          createPopper(ref_text, popper, {
          placement: 'right',
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, 10],
              },
            },
              {
                  name: 'flip',
                  options: {
                      fallbackPlacements: ['top'],
                  }
              }
          ],
        });
      }

      function show() {
        hide();
        popper.setAttribute('data-show', '');
        create();
      }

      function hide() {
        var poppers = document.querySelectorAll(".popper")
        poppers.forEach(popper => {
            popper.removeAttribute('data-show');
        });
      };

      const showEvents = ['click'];

      showEvents.forEach(function (event) {
        popper.addEventListener(event, show);
        ref_text.addEventListener(event, show);
      });
}

/**
 * Create and fill popper information from gene instance (neigh)
 * @function create_popper
 * @param {number} pos: relative position of gene from central gene
 * @param {object} neigh: gene information of neighbor/central gene
 * @param {number} counter: unique identifier.
 *                          Associated to particular gene in graph
 */
export function create_popper(pos : number,
                       neigh : Gene, 
                       notation : string,
                       taxlevel : (number|string),
                       tpred_level : string,
                       counter : number) {
    var popper_d3 = select("div#synteny")
                   .append("div")
                   .attr("class", "popper col-md-4")
                   .attr("id", "idx" + counter);
    var popper_html = get_popper_html(pos,
                                      neigh,
                                      notation,
                                      taxlevel,
                                      tpred_level);
    // popper content
    popper_d3.append("div")
             .attr("class", "popper-content")
             .html(popper_html);
    if (neigh.domains) {
        var doms : any = new Set();
        neigh.domains.forEach((d : any) => {
            if (d.class && d.class != "") {
                doms.add(d.class)
            }
        })
        var colors = [
            '#6574cd',
            '#e6ac00',
            '#ffa3b2',
            "#254F93",
            "#c9b2fd",
            "#fcaf81",
            "#a9dff7",
            "#FF5C8D",
            "#838383",
            "#5F33FF",
            "#c7e3aa",
            "#abfdcb",
            "#D81E5B",
            "#47DAFF",
            "#c4ab77",
            "#A1A314",
            "#fff600",
            "#53257E",
            "#1e90ff",
            "#B6549A",
            "#7cd407",
            "#948ad6",
            "#7ba0d5",
            "#fcc6f8",
            "#fec24c",
            "#A40E4C",
            "#dd5a95",
            "#12982d",
            "#27bda9",
            "#F0736A",
            "#9354e7",
            "#cbd5e3",
            "#93605D",
            "#FFE770",
            "#6C9D7F",
            "#2c23e4",
            "#ff6200",
            "#406362"
              ];
        var palette = scale.ordinal()
                        .domain(doms)
                        .range(colors);
        draw_protDomains("dom" + neigh.gene, neigh.domains, neigh.size, 250, 7, palette)
    }
    // popper arrow
    popper_d3.append("div")
             .attr("class", "popper-arrow");

    var popper : HTMLElement = document.querySelector(".popper#idx" + counter);

    var rects = document.querySelectorAll("rect#idx" + counter);
    var paths = document.querySelectorAll("path#idx" + counter);
    var ref_text = document.querySelector("text#idx" + counter);

      function create() {
          // Popper Instance
          createPopper(ref_text, popper, {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, 8],
              },
            },
              {
                  name: 'flip',
                  options: {
                      fallbackPlacements: ['top'],
                  }
              }
          ],
        });
      }

      function show() {
        hide();
        popper.setAttribute('data-show', '');
        create();
      }

      function hide() {
        var poppers = document.querySelectorAll(".popper")
        poppers.forEach(popper => {
            popper.removeAttribute('data-show');
        });
      };

      const showEvents = ['click'];

      showEvents.forEach(function (event) {
        rects.forEach(r => r.addEventListener(event, show));
        paths.forEach(r => r.addEventListener(event, show));
        ref_text.addEventListener(event, show);
        popper.addEventListener(event, show);
      });
}


/**
 * Popper (pop-over) clickable feature and arrow rationale
 * required: .popper class div
 * @function popper_click
 */
export function popper_click() : void {
    $(document).click(function(e : any) {
        var poppers = document.querySelectorAll(".popper")
        poppers.forEach(popper => {
            popper.removeAttribute('data-show');
        });
        var targetId : string;
        try {
            targetId = lookForParent(e.target,
                                    "popper").id
        } catch {
            targetId = e.target.id;
        } 
        if (targetId.slice(0,3)=="idx"){
            var popper = document.querySelector(".popper#"+targetId);
            var refbound = document.querySelector("text#"+targetId)
                                   .getBoundingClientRect();
              if (refbound.right+195 > window.innerWidth){
                  select(".popper#"+targetId).select(".popper-arrow")
                        .style("right", window.innerWidth-refbound.right+'px');
              } else if(refbound.left < 195) {
                  select(".popper#"+targetId).select(".popper-arrow")
                        .style("left", refbound.left+'px')
                        .style("right", "");
              }
            popper.setAttribute("data-show", "");
          }

    });
};


