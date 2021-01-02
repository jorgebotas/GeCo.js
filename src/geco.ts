import { select } from 'd3';


import { get_levels,
         erase_graph,
         create_download_button,
         visualize_geco } from './g-context';

import parseNewick from './newick';

import { popper_click } from './popper';

import { select_box } from './select_box';

import { Gene, ParamSet, OptionSet, Field, TreeNode } from './interfaces';


function get_parameters(selector : string) : ParamSet {
    const viz : HTMLElement = document.querySelector(selector);
    const d3viz: d3.Selection<HTMLElement> = select(selector);
    // Manage notation input
    var enot : HTMLFormElement = viz.querySelector("select#notation");
    var notation : string = enot.options[enot.selectedIndex].value;
    // Manage number of genes to display on sides
    var eups : HTMLFormElement = viz.querySelector("select#nUpstream");
    var nups : number = +eups.options[eups.selectedIndex].value;
    // Manage number of genes to display on sides
    var edowns : HTMLFormElement = viz.querySelector("select#nDownstream");
    var ndowns : number = +edowns.options[edowns.selectedIndex].value;
    // Manage eggNOG taxonomic levels
    var ephy : HTMLFormElement = viz.querySelector("select#egg-level")
    var taxlevel : (number|string) = +ephy.options[ephy.selectedIndex].value;

    // Add additional fields to represent
    var fields : {[index:string] : Field} = {};
    // Manage taxonomic prediction levels
    var etax : HTMLFormElement = viz.querySelector("select#tax-rank")
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


    var edist : HTMLFormElement = viz.querySelector("select#distScale");
    var distScale : string = edist.options[edist.selectedIndex].value;
    
    var customScale : number = +(<HTMLInputElement>viz.querySelector("input#customScale")).value;

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
        d3viz.select("input#scaleSize").attr("checked", "");
    }
    if (options.scaleDist || options.collapseDist) {
        options.highlightAnchor = true;
        d3viz.select("input#highlightAnchor").attr("checked", "");

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


async function launch_graphication(selector : string,
                               data : {[index:string]:Gene},
                               newick : TreeNode, 
                               nenv: number,
                               colors : string[]) {
    console.log(data)
    const d3viz: d3.Selection<HTMLElement> = select(selector);
    // Remove previously computed graph
    erase_graph(selector, "graph", true);
    // Get eggNOG tax level names for friendlier visualization
    var eggNOG_levels = {}
    try {
        //await fetch('/results/eggNOG_LEVELS.txt')
            //.then(response => response.text())
            //.then(lvs => eggNOG_levels = JSON.parse(lvs))
        var levels = await $.ajax({
            url: '/egglevels/',
        })
        eggNOG_levels = JSON.parse(levels);
    } catch {};
    
    try {
        // Display eggNOG taxonomic levels
        var egg_levels = get_levels(data, "eggNOG");
        egg_levels.forEach((l : number|string) => {
            let name : string = String(l);
            if (name != "prediction" &&
                name != "scores") {
                if (eggNOG_levels != "{}" && 
                    eggNOG_levels[l]){
                    name += ": " + eggNOG_levels[l];
                }
                d3viz.select("select#egg-level")
                  .append("option")
                  .attr("value", l)
                  .html(name);
            }
          })
    } catch {
        d3viz.select("select#egg-level").style("display", " none");
    }

    // Taxonomic levels
    try {
        var tax_ranks = get_levels(data, "tax_prediction")
        tax_ranks.forEach((l : string) => {
            d3viz.select("select#tax-rank")
              .append("option")
              .attr("value", l)
              .html(l);
          })
    } catch {
        d3viz.select("select#tax-rank").style("display", " none");
    }

    // Display number of genes option
    for (let i = 1; i <= (nenv-1)/2; i++){
        d3viz.select("select#nUpstream")
            .append("option")
            .attr("value", i)
            .html(String(i));
        d3viz.select("select#nDownstream")
            .append("option")
            .attr("value", i)
            .html(String(i));
    }
      // Render custom select boxes
    try {

      select_box(selector);
    } catch{}
      d3viz.select("div#submit-params")
          .style("visibility", "visible")
          .style("opacity", 1);

      // Enable taxonomic level selection when eggNOG is selected
      d3viz.select(".notation>div>div.select-selected")
          .on("click",
            function() {
                var ephy = d3viz.select("select#egg-level");
                if((<any>this).childNodes[0].data != "eggNOG") {
                        ephy.attr("disabled", "");
                    } else {
                        ephy.attr("disabled", null);
                    }
            });
      // Enable/disble taxonomic rank with checkbox
      $("input[type='checkbox']#tax-rank").click( () =>  {
          let isChecked = $("input#tax-rank").is(":checked");
          let tax_rank = d3viz.select("select#tax-rank");
          if (isChecked) {
              tax_rank.attr("disabled", null);
          } else {
              tax_rank.attr("disabled", "");
          }
        })
      let params : ParamSet = get_parameters(selector);
      await visualize_geco(selector,
                         data,
                         newick,
                         nenv,
                         colors,
                         params);
}


function parameter_listener(selector : string, 
                            data: {[index:string]:Gene},
                            newick : TreeNode,
                            nenv : number,
                            colors : string[]) {
    const viz : HTMLElement = document.querySelector(selector);
    // Detect when form is submitted and draw graph accordingly
    const form = viz.querySelector("form#params");
    form.addEventListener(
      "submit",
      function (e) {
        e.preventDefault();
        let params : ParamSet = get_parameters(selector);
        visualize_geco(selector,
                            data,
                            newick,
                            nenv,
                            colors,
                            params);
      },
      false
    );
};


export default async function launch_GeCo(selector : string,
                                          data : {[index:string]:Gene},
                                          tree : string,
                                          nenv : number,
                                          colors : string[]) {
    var newick : TreeNode;
    if (tree) {
        newick = parseNewick(tree);
    }
    create_download_button(selector,
                           'download-newick', 
                           'newick.nwk',
                           undefined,
                           undefined,
                           undefined,
                           String(tree));
    parameter_listener(selector, data, newick, nenv, colors);
    await launch_graphication(selector,
                              data,
                              newick,
                              nenv,
                              colors)
    popper_click();
}

window.launch_GeCo = launch_GeCo;
