export interface Margin {
    top : number;
    right : number;
    bottom : number;
    left : number;
}

export interface ParamSet {
    notation: string;
    nside : { upstream : number, downstream : number };
    taxlevel : number | string;
    tpred_level : string;
    fields : {[index:string] : Field};
    options : OptionSet
}
export interface OptionSet {
    [index:string] : boolean|number;
}

export interface NSide {
    upstream : number;
    downstream : number;
}

export interface Notation {
    [index : string] : number|string;
    percentage? : number|string;
    description? : string;
}

export interface Gene {
    [index : string] : any;
    // Only in neighborhood genes
    frequency? : number|string;
    // Present in all Gene instances
    unigene? : string;
    preferred_name? : string;
    n_contig? : number;
    tax_prediction? : number|string;
    GMGFam? : string;
    metadata? : string;
    strand? : "+"|"-";
    start? : number;
    end? : number;
    swapped? : 1;
    KEGG? : {[index : string] : Notation};
    eggNOG? : {
        // Scores and taxonomic levels
        [index : string] : Notation | {[index : string] : Notation};
    };
    // Only in central genes
    neighborhood? : {
        [index : string] : Gene;
    }
}

export interface Rect {
    w? : number;
    h? : number;
    ph? : number;
    pv? : number;
}

export interface Circle {
    r : number;
    fill? : string;
}

export interface Field {
    rep : "circle"|"text";
    circle? : Circle;
    text? : string;
    level? : number|string;
    legend? : {
        div : string;
        title : string;
    };
    palette? : any;
    y? : number;
}

export interface TreeNode {
    branchset? : TreeNode[];
    parent? : TreeNode;
    children? : TreeNode[];
    source? : TreeNode;
    target? : TreeNode;
    name? : string;
    depth? : number;
    length? : number;
    rootDist? : number;
    dotted? : number;
    support? : number;
    x? : number;
    y? : number
}
