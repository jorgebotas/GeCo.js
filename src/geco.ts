import { select } from 'd3';


import { get_levels,
         erase_graph,
         create_download_button,
         render_graph } from './g-context';

import parseNewick from './newick';

import { popper_click } from './popper';

import { select_box } from './select_box';

import { TreeNode } from './interfaces';

const nenv : number = 41;

var query_cluster : string;
var data : any;
var newick : TreeNode;



async function get_data(isCluster : boolean,
                        cutoff : string|number,
                        url? : string) {
    var url_root : string = "/getcontext/";
    if (isCluster) {
        url_root += "cluster/";
    } else {
        url_root += "unigene/"
    }

    let data : any;
    var url_path : string;
    if (url) {
        url_path = url;
    } else {
        url_path  = url_root + query_cluster + "/" + cutoff;
    }
    $('.loader').show();
    data = await $.ajax({
      url: url_path,
      complete: function(){
        $('.loader').hide();
      },
      error: function() {
          $('.loader').hide();
          alert("Incorrect cluster identifier")
      }
    })

        //data = await JSON.parse(data);
    return data;
}


async function get_newick(url : string) {

    var newick_raw = await $.ajax({
      url: url,
      error: function() {
          console.log("No tree found")
      }
    })

    return parseNewick(newick_raw)
}


async function launch_analysis(isCluster=true, 
                               cutoff=30,
                               inputfile?: JSON, 
                               queryList?: string[]) {
    // Remove previously computed graph
    erase_graph("graph", true);

    // ASYNC CALL TO MONGO SERVER
    if(inputfile) {
        data = inputfile;
        
    } else if(queryList){
        let url = '/getcontext/list/' + queryList.join(",") + "/" + cutoff;
        data = await get_data(isCluster, cutoff, url);

    } else {
        data = await get_data(isCluster, cutoff);
    }

    // Get tree in Newick format
    try {
        let newick_url = "/tree/" + query_cluster + "/";
        newick = await get_newick(newick_url);
        create_download_button('download-newick',
                               'newick.txt',
                               undefined,
                               undefined,
                               newick_url);
    } catch {
        newick = undefined;
    }

    console.log(data)

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
                select("select#egg-level")
                  .append("option")
                  .attr("value", l)
                  .html(name);
            }
          })
    } catch {
        select("select#egg-level").style("display", " none");
    }

    // Taxonomic levels
    try {
        var tax_ranks = get_levels(data, "tax_prediction")
        tax_ranks.forEach((l : string) => {
            select("select#tax-rank")
              .append("option")
              .attr("value", l)
              .html(l);
          })
    } catch {
        select("select#tax-rank").style("display", " none");
    }

    // Display number of genes option
    for (let i = 1; i <= (nenv-1)/2; i++){
        select("select#nUpstream")
            .append("option")
            .attr("value", i)
            .html(String(i));
        select("select#nDownstream")
            .append("option")
            .attr("value", i)
            .html(String(i));
    }
      // Render custom select boxes
      select_box();
      select("div#submit-params")
          .style("visibility", "visible")
          .style("opacity", 1);

      // Enable taxonomic level selection when eggNOG is selected
      select(".notation>div>div.select-selected")
          .on("click",
            function() {
                var ephy = select("select#egg-level");
                if((<any>this).childNodes[0].data != "eggNOG") {
                        ephy.attr("disabled", "");
                    } else {
                        ephy.attr("disabled", null);
                    }
            });
      // Enable/disble taxonomic rank with checkbox
      $("input[type='checkbox']#tax-rank").click( () =>  {
          let isChecked = $("input#tax-rank").is(":checked");
          let tax_rank = select("select#tax-rank");
          if (isChecked) {
              tax_rank.attr("disabled", null);
          } else {
              tax_rank.attr("disabled", "");
          }
        })
      await render_graph("graph",
                         data,
                         nenv,
                         "/static/geco/txt/colors.txt",
                         newick);
}


function parameter_listener() {

// Detect when form is submitted and draw graph accordingly
const form = document.querySelector("form#params");
form.addEventListener(
  "submit",
  function (e) {
    e.preventDefault();
    render_graph("graph",
                        data,
                        nenv,
                        "/static/geco/txt/colors.txt",
                        newick);
      // "/results/" + query_cluster + "_newick.txt"
  },
  false
);
};


async function main() {
    //document.querySelector("h1").scrollIntoView(true);
    parameter_listener();
    popper_click();

    //var queryString = window.location.search;
    //var urlParams = new URLSearchParams(queryString);
    var urlPath = window.location.pathname.split("/");

    var context = urlPath[1]
    query_cluster = urlPath[2];
    var cutoff = +urlPath[3];

    if (context == "clustercontext") {
        await launch_analysis(true, cutoff);
    } else if (context == "unigenecontext") {
        await launch_analysis(false, cutoff);
    } else if (context == "listcontext"){
        let genelist : string[] = String(urlPath[2]).split(",");
        await launch_analysis(false,
                        cutoff,
                        undefined,
                        genelist)
    } else if (context == "filecontext"){
        let uploaded_url : string = String(urlPath[2]).replaceAll(",", "/");
        let inputfile : JSON;
        await fetch(uploaded_url)
            .then(response => response.text())
            .then(txt => inputfile = JSON.parse(txt))
        await launch_analysis(false, 
                        cutoff, 
                        inputfile);
    }

    select('ul.navbar')
        .style('visibility', 'visible')
        .style('opacity', 1);
}

main();
