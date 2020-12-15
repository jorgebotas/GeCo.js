export function render_html(div_id? : string) {
    var div : string = "body";
    if(div_id){
        div = "div#" + div_id;
    }
    var container = d3.select(div);

    var submit = adiv(container, "submit-params");
    var inparams = adiv(submit, "input-params");
    // Custom select
    cselect(inparams, 200, "input", "nside");
    cselect(inparams, 200, "input", "tax-rank");
    cselect(inparams, 180, "input", "notation");
    cselect(inparams, 200, "input", "egg-level");

    // Submit button
    submit.append("button")
          .attr("type", "submit")
          .attr("class", "input")
          .attr("html", "Submit")
    
    // Download button
    container.append("button")
         .attr("type", "submit")
         .attr("id", "download-context")
         .attr("html", "Download graph")
    // Graph
    var graph = adiv(container, "graph");
    adiv(graph, "phylogram");
    adiv(graph, "synteny");
    var legend = adiv(graph).attr("class", "legend");
    adiv(legend, "legend").attr("class", "sticky");
}


function adiv(g : any, id? : string) {
    var d = g.append("div");
    if (id){
        d = d.attr("id", id)

    }
    return d
}


export function atext(g : any, 
                      text : string,
                      x : number,
                      y : number,
                      id?:string) {
    var t = g
      .append("text")
      .attr("x", x)
      .attr("y", y)
      .text(text)
      .style("font-weight", "bold")
    if (id) {
      t.attr("id", id);
    }
    return t;
}


export function draw_circle(g : any,
                   r : number,
                   cx : number,
                   cy : number,
                   fill : string,
                   id? : string){
    var c = g.append("circle")
             .attr("r", r)
             .attr("cx", cx)
             .attr("cy", cy)
             .style("fill", fill);
    if (id) {
        c.attr("id", id);
    }
    return c;
}


export function draw_rect(g : any,
                   x : number,
                   y : number,
                   w : number,
                   h : number,
                   fill : string,
                   id? : string){
    var r = g.append("rect")
              .attr("id", id)
              .attr("x", x)
              .attr("y", y)
              .attr("width", w)
              .attr("height", h)
              .style("z-index", -1)
              .style("outline", "none")
              .style("cursor", "pointer")
              .attr("fill", fill);
    if (id) {
        r.attr("id", id);
    }
    return r;
}


function cselect(g : any, 
                width : number,
                select_class : string,
                id : string) {
    var cs = adiv(g)
              .attr("class", "custom-select")
              .attr("width", width + "px");
    cs.append("select")
      .attr("class", select_class)
      .attr("name", id)
      .attr("id", id)
    return cs
}

export function acheckbox(g: any,
                label: string,
                className?: string,
                id?: string,
                switch_toggle = true) {

    let container_class = "form-check"
    if (switch_toggle) {
        container_class += " form-switch ml-4";
    } else {
        container_class += " ml-2";
    }
    let container = g.append("label")
                     .attr("class", container_class);
    let checkmark = container.append("input")
                         .attr("class", 
                             "mt-0 form-check-input form-check-legend rounded-pill "
                             + className)
                         .attr("type", "checkbox")
                         .attr("checked", "")
                         .attr("style", "margin-top:0 !important;");
    if (id) {
        checkmark.attr("id", id);
    }
    
    container.append("span")
             .attr("class", "form-check-label")
             .html(label);
    return container;
}
